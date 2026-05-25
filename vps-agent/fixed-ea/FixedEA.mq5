#property strict
#property copyright "ChatGPT"
#property version   "1.31"

//==================================================
// EXTRACK FILLED ORDER PAIRING SYNC EA v1.31
//
// Behavior:
// 1. EA start hote hi complete history ke paired trades bundle me bhejega.
// 2. Uske baad timer pe sirf new unsent paired trades bhejega.
// 3. 1 trade ho ya 1000, ek hi JSON array request me jayega.
// 4. Trade fail nahi hota. Sirf server/network fail ho sakta hai.
//==================================================

//================ INPUTS =================
input string ServerURL           = "https://extrack-backend-9xk0.onrender.com/api/save-api-trade";
input string BalanceURL          = "https://extrack-backend-9xk0.onrender.com/api/mt5/balance-update";
input string IngestSecret        = "replace-with-mt5-ingest-secret";

input int    Timeout             = 15000;
input int    SyncIntervalMs      = 5000;

input bool   SendInitialHistory  = true;
input bool   SendRealTimeUpdates = true;
input bool   SendBalanceUpdates  = false;
input double MinBalanceChange    = 1.0;

// Important controls
input bool   ResendAllOnStart    = true;   // EA start hote hi complete history dobara bhejega
input bool   TrackSentPairs      = true;   // timer pe duplicate repeat rokne ke liye

//================ GLOBAL =================
double lastBalance = 0;
double lastEquity  = 0;

string sentTradesFile = "extrack_sent_order_pairs.bin";

ulong sentPairKeys[];
int sentPairKeysCount = 0;

bool isSyncing = false;
bool forceResendNextSync = false;

string lastSyncError = "";

//================ STRUCTS =================
struct FilledOrder
{
   ulong orderTicket;
   ulong dealTicket;

   string symbol;
   long orderType;

   double volume;
   double price;

   datetime timeDone;

   double profit;
   double swap;
   double commission;

   long positionId;
};

struct CompletedTrade
{
   ulong pairKey;

   ulong entryOrder;
   ulong exitOrder;

   string symbol;
   string typeStr;

   double volume;
   double entryPrice;
   double exitPrice;

   datetime openTime;
   datetime closeTime;

   double profit;
   double swap;
   double commission;

   long positionId;
};

//================ HELPERS =================
string JsonEscape(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   StringReplace(s, "\r", "\\r");
   StringReplace(s, "\n", "\\n");
   StringReplace(s, "\t", "\\t");
   return s;
}

string LowerText(string s)
{
   StringToLower(s);
   return s;
}

ulong MakePairKey(ulong entryOrder, ulong exitOrder)
{
   return (entryOrder ^ (exitOrder * 1315423911));
}

string InferSymbolCategory(string symbol, string path, string description)
{
   string text = LowerText(symbol + " " + path + " " + description);

   if(StringFind(text, "crypto") >= 0 ||
      StringFind(text, "coin") >= 0 ||
      StringFind(text, "token") >= 0)
      return "crypto";

   if(StringFind(text, "gold") >= 0 ||
      StringFind(text, "silver") >= 0 ||
      StringFind(text, "xau") >= 0 ||
      StringFind(text, "xag") >= 0 ||
      StringFind(text, "metal") >= 0)
      return "metal";

   if(StringFind(text, "forex") >= 0 ||
      StringFind(text, "fx") >= 0 ||
      StringFind(text, "currency") >= 0)
      return "forex";

   if(StringFind(text, "index") >= 0 ||
      StringFind(text, "indices") >= 0)
      return "index";

   if(StringFind(text, "stock") >= 0 ||
      StringFind(text, "equity") >= 0)
      return "stock";

   if(StringFind(text, "oil") >= 0 ||
      StringFind(text, "brent") >= 0 ||
      StringFind(text, "wti") >= 0)
      return "commodity";

   return "";
}

string GetAssetClassFromCalcMode(string symbol)
{
   long mode = SymbolInfoInteger(symbol, SYMBOL_TRADE_CALC_MODE);

   if(mode == SYMBOL_CALC_MODE_FOREX ||
      mode == SYMBOL_CALC_MODE_FOREX_NO_LEVERAGE)
      return "forex";

   if(mode == SYMBOL_CALC_MODE_CFDINDEX)
      return "index";

   if(mode == SYMBOL_CALC_MODE_EXCH_STOCKS ||
      mode == SYMBOL_CALC_MODE_EXCH_STOCKS_MOEX)
      return "stock";

   if(mode == SYMBOL_CALC_MODE_FUTURES ||
      mode == SYMBOL_CALC_MODE_EXCH_FUTURES ||
      mode == SYMBOL_CALC_MODE_EXCH_FUTURES_FORTS)
      return "futures";

   if(mode == SYMBOL_CALC_MODE_CFD ||
      mode == SYMBOL_CALC_MODE_CFDLEVERAGE)
      return "cfd";

   return "";
}

//================ SENT TRACKING =================
bool IsPairSent(ulong pairKey)
{
   for(int i = 0; i < sentPairKeysCount; i++)
   {
      if(sentPairKeys[i] == pairKey)
         return true;
   }

   return false;
}

void MarkPairSent(ulong pairKey)
{
   if(pairKey == 0)
      return;

   if(IsPairSent(pairKey))
      return;

   int size = ArraySize(sentPairKeys);
   ArrayResize(sentPairKeys, size + 1);

   sentPairKeys[size] = pairKey;
   sentPairKeysCount++;
}

void LoadSentPairs()
{
   int h = FileOpen(sentTradesFile, FILE_READ | FILE_BIN);

   if(h == INVALID_HANDLE)
      return;

   while(!FileIsEnding(h))
   {
      ulong key = (ulong)FileReadLong(h);

      if(key == 0)
         continue;

      MarkPairSent(key);
   }

   FileClose(h);
}

void SaveSentPairs()
{
   if(!TrackSentPairs)
      return;

   int h = FileOpen(sentTradesFile, FILE_WRITE | FILE_BIN);

   if(h == INVALID_HANDLE)
      return;

   for(int i = 0; i < sentPairKeysCount; i++)
      FileWriteLong(h, (long)sentPairKeys[i]);

   FileClose(h);
}

//================ INIT =================
int OnInit()
{
   Print("=== Extrack Filled Order Pairing Sync EA v1.31 Started ===");

   if(TrackSentPairs)
      LoadSentPairs();

   if(ResendAllOnStart)
   {
      forceResendNextSync = true;
      Print("ResendAllOnStart enabled. First sync will ignore local sent state and send complete bundle.");
   }

   lastBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   lastEquity  = AccountInfoDouble(ACCOUNT_EQUITY);

   if(SendInitialHistory)
      SyncAllUnsentTrades();

   if(SendRealTimeUpdates || SendBalanceUpdates)
      EventSetMillisecondTimer(SyncIntervalMs);

   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   SaveSentPairs();
   EventKillTimer();
   Comment("");
}

void OnTimer()
{
   if(SendRealTimeUpdates)
      SyncAllUnsentTrades();

   if(SendBalanceUpdates)
      CheckBalanceChanges();
}

//================ MAIN SYNC =================
void SyncAllUnsentTrades()
{
   if(isSyncing)
      return;

   isSyncing = true;

   bool forceThisSync = forceResendNextSync;

   datetime fromTime = 0;
   datetime toTime   = TimeCurrent();

   if(!HistorySelect(fromTime, toTime))
   {
      lastSyncError = "HistorySelect failed";
      Print(lastSyncError);
      ShowSyncStatus(0, 0, 0, 0, lastSyncError);
      isSyncing = false;
      return;
   }

   FilledOrder orders[];
   int filledCount = CollectFilledOrders(orders);

   if(filledCount <= 0)
   {
      ShowSyncStatus(0, 0, 0, sentPairKeysCount, "No filled orders found");
      isSyncing = false;
      return;
   }

   SortFilledOrdersByTime(orders);

   CompletedTrade trades[];
   int pairedCount = BuildCompletedTradesFromOrders(orders, trades);

   if(pairedCount <= 0)
   {
      ShowSyncStatus(filledCount, 0, 0, sentPairKeysCount, "No completed paired trades found");
      isSyncing = false;
      return;
   }

   string json = "[";
   int readyCount = 0;

   ulong readyKeys[];
   int readyKeyCount = 0;

   for(int i = 0; i < pairedCount; i++)
   {
      // First start pe complete history dobara bhejna hai,
      // isliye sent file ko ignore karenge.
      // Timer pe force false hoga, tab sirf unsent jayenge.
      if(!forceThisSync && TrackSentPairs && IsPairSent(trades[i].pairKey))
         continue;

      string tradeJson = BuildTradeJson(trades[i]);

      if(tradeJson == "")
         continue;

      if(readyCount > 0)
         json += ",";

      json += tradeJson;

      int size = ArraySize(readyKeys);
      ArrayResize(readyKeys, size + 1);
      readyKeys[size] = trades[i].pairKey;

      readyKeyCount++;
      readyCount++;
   }

   json += "]";

   if(readyCount <= 0)
   {
      ShowSyncStatus(filledCount, pairedCount, 0, sentPairKeysCount, "No unsent completed trades");

      if(forceThisSync)
         forceResendNextSync = false;

      isSyncing = false;
      return;
   }

   if(forceThisSync)
      Print("FORCE START BUNDLE: Sending complete history bundle. Trades in one request: ", readyCount);
   else
      Print("Sending unsent bundle. Trades in one request: ", readyCount);

   bool ok = SendToServer(json, ServerURL);

   if(!ok)
   {
      lastSyncError = "Server/network send failed. Nothing marked sent. Will retry.";
      Print(lastSyncError);
      ShowSyncStatus(filledCount, pairedCount, readyCount, sentPairKeysCount, lastSyncError);
      isSyncing = false;
      return;
   }

   if(TrackSentPairs)
   {
      for(int k = 0; k < readyKeyCount; k++)
         MarkPairSent(readyKeys[k]);

      SaveSentPairs();
   }

   if(forceThisSync)
      forceResendNextSync = false;

   lastSyncError = "";

   if(forceThisSync)
      Print("Force complete bundle sync success. Sent completed trades: ", readyCount);
   else
      Print("Unsent bundle sync success. Sent completed trades: ", readyCount);

   ShowSyncStatus(filledCount, pairedCount, 0, sentPairKeysCount, "Bundle sync success");

   isSyncing = false;
}

//================ COLLECT FILLED ORDERS =================
int CollectFilledOrders(FilledOrder &orders[])
{
   int totalOrders = HistoryOrdersTotal();
   int count = 0;

   for(int i = 0; i < totalOrders; i++)
   {
      ulong orderTicket = HistoryOrderGetTicket(i);

      if(orderTicket == 0)
         continue;

      long state = HistoryOrderGetInteger(orderTicket, ORDER_STATE);

      if(state != ORDER_STATE_FILLED)
         continue;

      long type = HistoryOrderGetInteger(orderTicket, ORDER_TYPE);

      if(type != ORDER_TYPE_BUY && type != ORDER_TYPE_SELL)
         continue;

      string symbol = HistoryOrderGetString(orderTicket, ORDER_SYMBOL);

      if(symbol == "")
         continue;

      FilledOrder fo;

      fo.orderTicket = orderTicket;
      fo.dealTicket  = 0;

      fo.symbol      = symbol;
      fo.orderType   = type;
      fo.volume      = HistoryOrderGetDouble(orderTicket, ORDER_VOLUME_INITIAL);
      fo.price       = HistoryOrderGetDouble(orderTicket, ORDER_PRICE_OPEN);
      fo.timeDone    = (datetime)HistoryOrderGetInteger(orderTicket, ORDER_TIME_DONE);

      fo.profit      = 0;
      fo.swap        = 0;
      fo.commission  = 0;
      fo.positionId  = (long)HistoryOrderGetInteger(orderTicket, ORDER_POSITION_ID);

      AttachDealDataToOrder(fo);

      if(fo.volume <= 0)
         continue;

      if(fo.price <= 0)
         continue;

      if(fo.timeDone <= 0)
         continue;

      int size = ArraySize(orders);
      ArrayResize(orders, size + 1);
      orders[size] = fo;

      count++;
   }

   Print("DIAG: Filled orders collected: ", count, " / HistoryOrdersTotal: ", totalOrders);

   return count;
}

//================ DEAL DATA FOR ORDER =================
void AttachDealDataToOrder(FilledOrder &fo)
{
   int totalDeals = HistoryDealsTotal();

   for(int i = 0; i < totalDeals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);

      if(dealTicket == 0)
         continue;

      ulong dealOrder = (ulong)HistoryDealGetInteger(dealTicket, DEAL_ORDER);

      if(dealOrder != fo.orderTicket)
         continue;

      fo.dealTicket = dealTicket;

      double dealPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double dealVolume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      if(dealPrice > 0)
         fo.price = dealPrice;

      if(dealVolume > 0)
         fo.volume = dealVolume;

      if(dealTime > 0)
         fo.timeDone = dealTime;

      fo.profit     += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      fo.swap       += HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      fo.commission += HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);

      long posId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

      if(posId > 0)
         fo.positionId = posId;
   }
}

//================ SORT ORDERS =================
void SortFilledOrdersByTime(FilledOrder &orders[])
{
   int n = ArraySize(orders);

   for(int i = 0; i < n - 1; i++)
   {
      for(int j = i + 1; j < n; j++)
      {
         if(orders[j].timeDone < orders[i].timeDone)
         {
            FilledOrder temp = orders[i];
            orders[i] = orders[j];
            orders[j] = temp;
         }
      }
   }
}

//================ BUILD COMPLETED TRADES =================
int BuildCompletedTradesFromOrders(FilledOrder &orders[], CompletedTrade &trades[])
{
   int n = ArraySize(orders);
   int paired = 0;

   bool used[];
   ArrayResize(used, n);

   for(int u = 0; u < n; u++)
      used[u] = false;

   for(int i = 0; i < n; i++)
   {
      if(used[i])
         continue;

      for(int j = i + 1; j < n; j++)
      {
         if(used[j])
            continue;

         if(orders[i].symbol != orders[j].symbol)
            continue;

         if(orders[i].orderType == orders[j].orderType)
            continue;

         CompletedTrade ct;

         ct.entryOrder = orders[i].orderTicket;
         ct.exitOrder  = orders[j].orderTicket;
         ct.pairKey    = MakePairKey(ct.entryOrder, ct.exitOrder);

         ct.symbol     = orders[i].symbol;
         ct.volume     = MathMin(orders[i].volume, orders[j].volume);

         ct.entryPrice = orders[i].price;
         ct.exitPrice  = orders[j].price;

         ct.openTime   = orders[i].timeDone;
         ct.closeTime  = orders[j].timeDone;

         ct.positionId = orders[j].positionId;

         if(orders[i].orderType == ORDER_TYPE_BUY && orders[j].orderType == ORDER_TYPE_SELL)
            ct.typeStr = "BUY";
         else
            ct.typeStr = "SELL";

         ct.profit     = orders[j].profit;
         ct.swap       = orders[i].swap + orders[j].swap;
         ct.commission = orders[i].commission + orders[j].commission;

         int size = ArraySize(trades);
         ArrayResize(trades, size + 1);
         trades[size] = ct;

         used[i] = true;
         used[j] = true;

         paired++;
         break;
      }
   }

   int unpaired = 0;

   for(int x = 0; x < n; x++)
   {
      if(!used[x])
         unpaired++;
   }

   Print("DIAG: Completed paired trades: ", paired, " | Unpaired filled orders: ", unpaired);

   return paired;
}

//================ JSON BUILD =================
string BuildTradeJson(CompletedTrade &trade)
{
   string accCurrency = AccountInfoString(ACCOUNT_CURRENCY);

   SymbolSelect(trade.symbol, true);

   string symbolPath        = SymbolInfoString(trade.symbol, SYMBOL_PATH);
   string symbolDescription = SymbolInfoString(trade.symbol, SYMBOL_DESCRIPTION);

   string assetClass     = GetAssetClassFromCalcMode(trade.symbol);
   string symbolCategory = InferSymbolCategory(trade.symbol, symbolPath, symbolDescription);

   if(symbolCategory == "" && assetClass != "")
      symbolCategory = assetClass;

   double balanceAfter  = AccountInfoDouble(ACCOUNT_BALANCE);
   double balanceBefore = balanceAfter - trade.profit;

   double percentChange = 0;

   if(balanceBefore > 0)
      percentChange = (trade.profit / balanceBefore) * 100.0;

   string json =
      "{"
      + "\"account_id\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ","
      + "\"account_currency\":\"" + JsonEscape(accCurrency) + "\","

      // Backend unique ticket ke liye exit order ticket.
      + "\"ticket\":" + IntegerToString((long)trade.exitOrder) + ","

      + "\"entry_order\":" + IntegerToString((long)trade.entryOrder) + ","
      + "\"exit_order\":" + IntegerToString((long)trade.exitOrder) + ","
      + "\"position_id\":" + IntegerToString((long)trade.positionId) + ","

      + "\"symbol\":\"" + JsonEscape(trade.symbol) + "\","
      + "\"symbol_path\":\"" + JsonEscape(symbolPath) + "\","
      + "\"symbol_description\":\"" + JsonEscape(symbolDescription) + "\","
      + "\"symbol_category\":\"" + JsonEscape(symbolCategory) + "\","
      + "\"asset_class\":\"" + JsonEscape(assetClass) + "\","

      + "\"type\":\"" + JsonEscape(trade.typeStr) + "\","
      + "\"volume\":" + DoubleToString(trade.volume, 2) + ","
      + "\"entry_price\":" + DoubleToString(trade.entryPrice, 5) + ","
      + "\"exit_price\":" + DoubleToString(trade.exitPrice, 5) + ","

      + "\"profit\":" + DoubleToString(trade.profit, 2) + ","
      + "\"swap\":" + DoubleToString(trade.swap, 2) + ","
      + "\"commission\":" + DoubleToString(trade.commission, 2) + ","

      + "\"balance_before\":" + DoubleToString(balanceBefore, 2) + ","
      + "\"percent_change\":" + DoubleToString(percentChange, 2) + ","
      + "\"balance\":" + DoubleToString(balanceAfter, 2) + ","

      + "\"open_time\":\"" + TimeToString(trade.openTime, TIME_DATE | TIME_SECONDS) + "\","
      + "\"close_time\":\"" + TimeToString(trade.closeTime, TIME_DATE | TIME_SECONDS) + "\","
      + "\"open_timestamp\":" + IntegerToString((long)trade.openTime) + ","
      + "\"close_timestamp\":" + IntegerToString((long)trade.closeTime)
      + "}";

   return json;
}

//================ BALANCE CHECK =================
void CheckBalanceChanges()
{
   double curBal = AccountInfoDouble(ACCOUNT_BALANCE);
   double curEq  = AccountInfoDouble(ACCOUNT_EQUITY);

   if(MathAbs(curBal - lastBalance) < MinBalanceChange)
      return;

   double pct = 0;

   if(lastBalance > 0)
      pct = ((curBal - lastBalance) / lastBalance) * 100.0;

   string json =
      "{"
      + "\"old_balance\":" + DoubleToString(lastBalance, 2) + ","
      + "\"new_balance\":" + DoubleToString(curBal, 2) + ","
      + "\"balance_change\":" + DoubleToString(curBal - lastBalance, 2) + ","
      + "\"percent_change\":" + DoubleToString(pct, 2) + ","
      + "\"equity\":" + DoubleToString(curEq, 2) + ","
      + "\"update_time\":\"" + TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS) + "\""
      + "}";

   bool ok = SendToServer(json, BalanceURL);

   if(ok)
   {
      lastBalance = curBal;
      lastEquity  = curEq;
   }
}

//================ SERVER =================
bool SendToServer(string json, string url)
{
   uchar data[];

   StringToCharArray(json, data, 0, -1, CP_UTF8);

   if(ArraySize(data) > 0)
      ArrayResize(data, ArraySize(data) - 1);

   uchar result[];

   string responseHeaders = "";

   string requestHeaders =
      "Content-Type: application/json\r\n"
      + "x-ingest-secret: " + IngestSecret + "\r\n";

   ResetLastError();

   int res = WebRequest(
      "POST",
      url,
      requestHeaders,
      Timeout,
      data,
      result,
      responseHeaders
   );

   string responseBody = CharArrayToString(result);

   Print("POST URL: ", url);
   Print("Response code: ", res);
   Print("Response body: ", responseBody);

   if(res == -1)
   {
      Print("WebRequest failed. Error: ", GetLastError());
      return false;
   }

   if(res >= 200 && res < 300)
      return true;

   return false;
}

//================ STATUS =================
void ShowSyncStatus(int filledOrders, int pairedTrades, int unsentBundle, int sentSaved, string status)
{
   Comment(
      "Extrack Filled Order Pairing Sync EA v1.31\n",
      "Account: ", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)), "\n",
      "Filled orders found: ", filledOrders, "\n",
      "Completed paired trades: ", pairedTrades, "\n",
      "Unsent bundle trades: ", unsentBundle, "\n",
      "Sent pairs saved: ", sentSaved, "\n",
      "Force resend next sync: ", forceResendNextSync ? "true" : "false", "\n",
      "Status: ", status, "\n",
      "Last sync: ", TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS), "\n",
      "Last error: ", lastSyncError
   );
}