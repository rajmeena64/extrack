#property strict
#property copyright "ChatGPT"
#property version   "1.32"

//==================================================
// EXTRACK POSITION DEAL SYNC EA v1.32
//
// Fix in this version:
// - No symbol/opposite-side guessing.
// - Closed trades are built only from deals with the same MT5 position id.
// - FIFO matching is used for partial closes inside a position.
// - The unique backend ticket is a stable entry-deal + exit-deal hash,
//   so partial and multi-leg closes do not overwrite each other.
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

input bool   ResendAllOnStart    = true;
input bool   TrackSentTrades     = true;

//================ GLOBAL =================
double lastBalance = 0;
double lastEquity  = 0;

string sentTradesFile = "extrack_sent_position_deals_v132.bin";

ulong sentTradeKeys[];
int sentTradeKeysCount = 0;

bool isSyncing = false;
bool forceResendNextSync = false;

string lastSyncError = "";

//================ STRUCTS =================
struct TradeDeal
{
   ulong dealTicket;
   ulong orderTicket;

   string symbol;
   long dealType;
   long entryKind;

   double volume;
   double price;
   datetime timeDone;

   double profit;
   double swap;
   double commission;

   long positionId;
};

struct OpenLeg
{
   ulong dealTicket;
   ulong orderTicket;

   string symbol;
   long dealType;

   double remainingVolume;
   double price;
   datetime timeDone;

   double swap;
   double commission;

   long positionId;
};

struct CompletedTrade
{
   ulong tradeKey;

   ulong entryDeal;
   ulong exitDeal;
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

bool IsSameSide(long leftType, long rightType)
{
   return leftType == rightType;
}

bool IsOppositeSide(long leftType, long rightType)
{
   return (
      (leftType == DEAL_TYPE_BUY && rightType == DEAL_TYPE_SELL) ||
      (leftType == DEAL_TYPE_SELL && rightType == DEAL_TYPE_BUY)
   );
}

ulong MakeTradeKey(ulong entryDeal, ulong exitDeal)
{
   ulong mixed = (entryDeal * 1000003) ^ (exitDeal * 9176) ^ (entryDeal >> 7) ^ (exitDeal << 11);
   return (mixed % 9000000000000000000);
}

string DealTypeToTradeType(long entryDealType)
{
   if(entryDealType == DEAL_TYPE_BUY)
      return "BUY";

   return "SELL";
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
bool IsTradeSent(ulong tradeKey)
{
   for(int i = 0; i < sentTradeKeysCount; i++)
   {
      if(sentTradeKeys[i] == tradeKey)
         return true;
   }

   return false;
}

void MarkTradeSent(ulong tradeKey)
{
   if(tradeKey == 0)
      return;

   if(IsTradeSent(tradeKey))
      return;

   int size = ArraySize(sentTradeKeys);
   ArrayResize(sentTradeKeys, size + 1);

   sentTradeKeys[size] = tradeKey;
   sentTradeKeysCount++;
}

void LoadSentTrades()
{
   int h = FileOpen(sentTradesFile, FILE_READ | FILE_BIN);

   if(h == INVALID_HANDLE)
      return;

   while(!FileIsEnding(h))
   {
      ulong key = (ulong)FileReadLong(h);

      if(key == 0)
         continue;

      MarkTradeSent(key);
   }

   FileClose(h);
}

void SaveSentTrades()
{
   if(!TrackSentTrades)
      return;

   int h = FileOpen(sentTradesFile, FILE_WRITE | FILE_BIN);

   if(h == INVALID_HANDLE)
      return;

   for(int i = 0; i < sentTradeKeysCount; i++)
      FileWriteLong(h, (long)sentTradeKeys[i]);

   FileClose(h);
}

//================ INIT =================
int OnInit()
{
   Print("=== Extrack Position Deal Sync EA v1.32 Started ===");

   if(TrackSentTrades)
      LoadSentTrades();

   if(ResendAllOnStart)
   {
      forceResendNextSync = true;
      Print("ResendAllOnStart enabled. First sync will send complete history bundle.");
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
   SaveSentTrades();
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
      ShowSyncStatus(0, 0, 0, sentTradeKeysCount, lastSyncError);
      isSyncing = false;
      return;
   }

   TradeDeal deals[];
   int dealCount = CollectTradeDeals(deals);

   if(dealCount <= 0)
   {
      ShowSyncStatus(0, 0, 0, sentTradeKeysCount, "No trade deals found");
      isSyncing = false;
      return;
   }

   SortDealsByTime(deals);

   CompletedTrade trades[];
   int completedCount = BuildCompletedTradesFromDeals(deals, trades);

   if(completedCount <= 0)
   {
      ShowSyncStatus(dealCount, 0, 0, sentTradeKeysCount, "No closed position deals found");
      isSyncing = false;
      return;
   }

   string json = "[";
   int readyCount = 0;

   ulong readyKeys[];
   int readyKeyCount = 0;

   for(int i = 0; i < completedCount; i++)
   {
      if(!forceThisSync && TrackSentTrades && IsTradeSent(trades[i].tradeKey))
         continue;

      string tradeJson = BuildTradeJson(trades[i]);

      if(tradeJson == "")
         continue;

      if(readyCount > 0)
         json += ",";

      json += tradeJson;

      int size = ArraySize(readyKeys);
      ArrayResize(readyKeys, size + 1);
      readyKeys[size] = trades[i].tradeKey;

      readyKeyCount++;
      readyCount++;
   }

   json += "]";

   if(readyCount <= 0)
   {
      ShowSyncStatus(dealCount, completedCount, 0, sentTradeKeysCount, "No unsent completed trades");

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
      ShowSyncStatus(dealCount, completedCount, readyCount, sentTradeKeysCount, lastSyncError);
      isSyncing = false;
      return;
   }

   if(TrackSentTrades)
   {
      for(int k = 0; k < readyKeyCount; k++)
         MarkTradeSent(readyKeys[k]);

      SaveSentTrades();
   }

   if(forceThisSync)
      forceResendNextSync = false;

   lastSyncError = "";

   if(forceThisSync)
      Print("Force complete bundle sync success. Sent completed trades: ", readyCount);
   else
      Print("Unsent bundle sync success. Sent completed trades: ", readyCount);

   ShowSyncStatus(dealCount, completedCount, 0, sentTradeKeysCount, "Bundle sync success");

   isSyncing = false;
}

//================ COLLECT DEALS =================
int CollectTradeDeals(TradeDeal &deals[])
{
   int totalDeals = HistoryDealsTotal();
   int count = 0;

   for(int i = 0; i < totalDeals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);

      if(dealTicket == 0)
         continue;

      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);

      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         continue;

      long entryKind = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

      if(entryKind != DEAL_ENTRY_IN &&
         entryKind != DEAL_ENTRY_OUT &&
         entryKind != DEAL_ENTRY_INOUT &&
         entryKind != DEAL_ENTRY_OUT_BY)
         continue;

      string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);

      if(symbol == "")
         continue;

      TradeDeal deal;

      deal.dealTicket = dealTicket;
      deal.orderTicket = (ulong)HistoryDealGetInteger(dealTicket, DEAL_ORDER);
      deal.symbol = symbol;
      deal.dealType = dealType;
      deal.entryKind = entryKind;
      deal.volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      deal.price = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      deal.timeDone = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      deal.profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      deal.swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      deal.commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      deal.positionId = (long)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

      if(deal.positionId <= 0)
      {
         Print("WARN: skipping deal without position id. deal=", (long)deal.dealTicket);
         continue;
      }

      if(deal.volume <= 0 || deal.price <= 0 || deal.timeDone <= 0)
         continue;

      int size = ArraySize(deals);
      ArrayResize(deals, size + 1);
      deals[size] = deal;

      count++;
   }

   Print("DIAG: Trade deals collected: ", count, " / HistoryDealsTotal: ", totalDeals);

   return count;
}

//================ SORT DEALS =================
void SortDealsByTime(TradeDeal &deals[])
{
   int n = ArraySize(deals);

   for(int i = 0; i < n - 1; i++)
   {
      for(int j = i + 1; j < n; j++)
      {
         if(deals[j].timeDone < deals[i].timeDone ||
            (deals[j].timeDone == deals[i].timeDone && deals[j].dealTicket < deals[i].dealTicket))
         {
            TradeDeal temp = deals[i];
            deals[i] = deals[j];
            deals[j] = temp;
         }
      }
   }
}

//================ BUILD COMPLETED TRADES =================
int BuildCompletedTradesFromDeals(TradeDeal &deals[], CompletedTrade &trades[])
{
   OpenLeg openLegs[];
   int completed = 0;
   int skippedClosers = 0;
   int reversalDeals = 0;

   int n = ArraySize(deals);

   for(int i = 0; i < n; i++)
   {
      TradeDeal deal = deals[i];

      if(deal.entryKind == DEAL_ENTRY_IN)
      {
         AddOpenLeg(openLegs, deal, deal.volume);
         continue;
      }

      if(deal.entryKind == DEAL_ENTRY_INOUT)
         reversalDeals++;

      if(deal.entryKind == DEAL_ENTRY_OUT ||
         deal.entryKind == DEAL_ENTRY_OUT_BY ||
         deal.entryKind == DEAL_ENTRY_INOUT)
      {
         double remainingCloseVolume = deal.volume;
         bool matchedAny = false;

         for(int legIndex = 0; legIndex < ArraySize(openLegs) && remainingCloseVolume > 0.0000001; legIndex++)
         {
            if(openLegs[legIndex].remainingVolume <= 0.0000001)
               continue;

            if(openLegs[legIndex].positionId != deal.positionId)
               continue;

            if(openLegs[legIndex].symbol != deal.symbol)
               continue;

            if(!IsOppositeSide(openLegs[legIndex].dealType, deal.dealType))
               continue;

            double matchedVolume = MathMin(openLegs[legIndex].remainingVolume, remainingCloseVolume);

            CompletedTrade ct;
            ct.entryDeal = openLegs[legIndex].dealTicket;
            ct.exitDeal = deal.dealTicket;
            ct.entryOrder = openLegs[legIndex].orderTicket;
            ct.exitOrder = deal.orderTicket;
            ct.tradeKey = MakeTradeKey(ct.entryDeal, ct.exitDeal);

            ct.symbol = deal.symbol;
            ct.typeStr = DealTypeToTradeType(openLegs[legIndex].dealType);
            ct.volume = matchedVolume;
            ct.entryPrice = openLegs[legIndex].price;
            ct.exitPrice = deal.price;
            ct.openTime = openLegs[legIndex].timeDone;
            ct.closeTime = deal.timeDone;
            ct.positionId = deal.positionId;

            double closeRatio = 1.0;
            if(deal.volume > 0)
               closeRatio = matchedVolume / deal.volume;

            double entryRatio = 1.0;
            if(openLegs[legIndex].remainingVolume > 0)
               entryRatio = matchedVolume / openLegs[legIndex].remainingVolume;

            ct.profit = deal.profit * closeRatio;
            ct.swap = (deal.swap * closeRatio) + (openLegs[legIndex].swap * entryRatio);
            ct.commission = (deal.commission * closeRatio) + (openLegs[legIndex].commission * entryRatio);

            int tradeSize = ArraySize(trades);
            ArrayResize(trades, tradeSize + 1);
            trades[tradeSize] = ct;

            openLegs[legIndex].remainingVolume -= matchedVolume;
            remainingCloseVolume -= matchedVolume;

            completed++;
            matchedAny = true;
         }

         if(!matchedAny)
         {
            skippedClosers++;
            Print("WARN: close deal had no matching open leg. deal=", (long)deal.dealTicket,
                  " pos=", deal.positionId, " symbol=", deal.symbol);
         }

         if(deal.entryKind == DEAL_ENTRY_INOUT && remainingCloseVolume > 0.0000001)
            AddOpenLeg(openLegs, deal, remainingCloseVolume);
      }
   }

   int openRemaining = 0;

   for(int x = 0; x < ArraySize(openLegs); x++)
   {
      if(openLegs[x].remainingVolume > 0.0000001)
         openRemaining++;
   }

   Print("DIAG: Completed position trades: ", completed,
         " | Open legs remaining: ", openRemaining,
         " | Unmatched close deals: ", skippedClosers,
         " | Reversal deals seen: ", reversalDeals);

   return completed;
}

void AddOpenLeg(OpenLeg &openLegs[], TradeDeal &deal, double volume)
{
   if(volume <= 0)
      return;

   OpenLeg leg;
   leg.dealTicket = deal.dealTicket;
   leg.orderTicket = deal.orderTicket;
   leg.symbol = deal.symbol;
   leg.dealType = deal.dealType;
   leg.remainingVolume = volume;
   leg.price = deal.price;
   leg.timeDone = deal.timeDone;
   leg.swap = deal.swap;
   leg.commission = deal.commission;
   leg.positionId = deal.positionId;

   int size = ArraySize(openLegs);
   ArrayResize(openLegs, size + 1);
   openLegs[size] = leg;
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

      + "\"ticket\":" + IntegerToString((long)trade.tradeKey) + ","
      + "\"entry_deal\":" + IntegerToString((long)trade.entryDeal) + ","
      + "\"exit_deal\":" + IntegerToString((long)trade.exitDeal) + ","
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
      + "\"pnl\":" + DoubleToString(trade.profit, 2) + ","
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
void ShowSyncStatus(int dealsFound, int completedTrades, int unsentBundle, int sentSaved, string status)
{
   Comment(
      "Extrack Position Deal Sync EA v1.32\n",
      "Account: ", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)), "\n",
      "Trade deals found: ", dealsFound, "\n",
      "Completed trades: ", completedTrades, "\n",
      "Unsent bundle trades: ", unsentBundle, "\n",
      "Sent trades saved: ", sentSaved, "\n",
      "Force resend next sync: ", forceResendNextSync ? "true" : "false", "\n",
      "Status: ", status, "\n",
      "Last sync: ", TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS), "\n",
      "Last error: ", lastSyncError
   );
}
