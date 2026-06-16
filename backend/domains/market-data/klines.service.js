// const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
// // const parquet = require("@dsnp/parquetjs");
// const { readParquet } = require("parquet-wasm");
// const express = require("express");

// const router = express.Router();

// const r2 = new S3Client({
//   region: "auto",
//   endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
//   credentials: {
//     accessKeyId: process.env.R2_ACCESS_KEY_ID,
//     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
//   },
// });

// const BUCKET = "ohlcv-data";

// async function fetchOneDay(symbol, date) {
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, "0");
//   const d = String(date.getDate()).padStart(2, "0");
//   const key = `${symbol}/${y}/${m}/${d}.parquet`;

//   try {
//     const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
//     const chunks = [];
//     for await (const chunk of res.Body) chunks.push(chunk);
//     const buffer = Buffer.concat(chunks);

//         const reader = await parquet.ParquetReader.openBuffer(buffer);
//       const cursor = reader.getCursor();

//       const rows = [];
//       let row;

//       while ((row = await cursor.next())) {
//         rows.push(row);
//       }

//       await reader.close();
//     return rows;
//   } catch (err) {
//     if (err?.name === "NoSuchKey") return null;
//     throw err;
//   }
// }

// // GET /api/ohlcv?symbol=AUDCAD&start=2024-01-01&end=2024-01-31
// router.get("/", async (req, res) => {
//   const { symbol, start, end } = req.query;

//   if (!symbol || !start || !end) {
//     return res.status(400).json({ error: "symbol, start, end required" });
//   }

//   const startDate = new Date(start);
//   const endDate = new Date(end);

//   if (isNaN(startDate) || isNaN(endDate)) {
//     return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
//   }

//   if (startDate > endDate) {
//     return res.status(400).json({ error: "start must be before end" });
//   }

//   const days = [];
//   const cur = new Date(startDate);
//   while (cur <= endDate) {
//     days.push(new Date(cur));
//     cur.setDate(cur.getDate() + 1);
//   }

//   try {
//     const results = await Promise.all(
//       days.map((d) => fetchOneDay(symbol.toUpperCase(), d))
//     );

//     const data = results
//       .filter(Boolean)
//       .flat()
//       .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

//     return res.json({ symbol, start, end, total: data.length, data });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: "Failed to fetch data" });
//   }
// });

// module.exports = router;




const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
  const { symbol, start, end } = req.query;

  if (!symbol || !start || !end) {
    return res.status(400).json({
      error: "symbol, start, end required",
    });
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/ohlcv?symbol=${encodeURIComponent(
        symbol
      )}&start=${encodeURIComponent(
        start
      )}&end=${encodeURIComponent(end)}`
    );

    if (!response.ok) {
      throw new Error(`Python service error: ${response.status}`);
    }

    const data = await response.json();
    console.log("🔥 Python Response:");
    console.log("Total:", data.total);
    console.log("Sample:", data.data?.slice(0, 3)); // first 3 rows

    return res.json(data);
  

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to fetch data",
    });
  }
});

module.exports = router;