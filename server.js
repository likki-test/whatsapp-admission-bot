require("dotenv").config();

const express = require("express");
const axios = require("axios");
const addRowToSheet = require("./sheets");

const app = express();
app.use(express.json());

/* ===== HEALTH CHECK ROUTE ===== */
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});


/* ===== CONFIG ===== */

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = "admission_verify_token";

/* ===== BASIC CHECK ===== */

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.log("❌ ACCESS_TOKEN or PHONE_NUMBER_ID missing in .env file");
  process.exit(1);
}

/* ===== USER SESSION STORAGE ===== */

let userState = {};
let userData = {};

/* ===== SEND WHATSAPP MESSAGE ===== */

async function sendMessage(phone, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.log("❌ WhatsApp Send Error:");
    console.log(error.response?.data || error.message);
  }
}

/* ===== WEBHOOK VERIFICATION ===== */

app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }

  return res.sendStatus(403);
});

/* ===== RECEIVE MESSAGE ===== */

app.post("/webhook", async (req, res) => {
  try {
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const phone = message.from;
    const text = message.text?.body?.trim();

    if (!text) return res.sendStatus(200);

    /* ===== START FLOW ===== */

    if (!userState[phone]) {
      userState[phone] = "NAME";
      userData[phone] = { phone };

      await sendMessage(
        phone,
        "👋 Welcome to ABC College Admissions!\nPlease enter your *full name*."
      );

      return res.sendStatus(200);
    }

    let state = userState[phone];

    /* ===== NAME STEP ===== */

    if (state === "NAME") {
      userData[phone].name = text;
      userState[phone] = "COURSE";

      await sendMessage(
        phone,
        "📘 Which course are you interested in?\n(MBA / BCA / MCA / BBA / B.Com)"
      );
    }

    /* ===== COURSE STEP ===== */

    else if (state === "COURSE") {
      userData[phone].course = text;
      userState[phone] = "EMAIL";

      await sendMessage(
        phone,
        "📧 Please enter your email address."
      );
    }

    /* ===== EMAIL STEP ===== */

    else if (state === "EMAIL") {

      if (!text.includes("@")) {
        await sendMessage(
          phone,
          "❌ Invalid email. Please enter a valid email address."
        );
        return res.sendStatus(200);
      }

      userData[phone].email = text;

      /* ===== SAVE TO GOOGLE SHEETS ===== */

      await addRowToSheet({
        name: userData[phone].name,
        phone: userData[phone].phone,
        email: userData[phone].email,
        course: userData[phone].course,
        source: "WhatsApp",
        status: "New"
      });

      await sendMessage(
        phone,
        "✅ Thank you! Your admission enquiry has been recorded.\nOur team will contact you shortly."
      );

      delete userState[phone];
      delete userData[phone];
    }

  } catch (err) {
    console.log("❌ Webhook Error:", err.message);
  }

  res.sendStatus(200);
});

/* ===== START SERVER ===== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
