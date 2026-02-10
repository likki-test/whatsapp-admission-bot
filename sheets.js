const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const SPREADSHEET_ID = "1l5h_rAIkFPWyayj6r3WNjRiuEMXh6WGwznuUIYSEbCg";

async function addRowToSheet(data) {
  const client = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: client
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sheet1!A:F",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[
        data.name,
        data.phone,
        data.email,
        data.course,
        data.source,
        data.status
      ]]
    }
  });
}

module.exports = addRowToSheet;
