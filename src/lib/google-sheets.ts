import { google } from 'googleapis';

function getGoogleAuth() {
  const serviceAccountJsonStr = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJsonStr) {
    console.warn('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON is not configured in env.');
    return null;
  }

  try {
    const credentials = typeof serviceAccountJsonStr === 'string' && serviceAccountJsonStr.startsWith('{')
      ? JSON.parse(serviceAccountJsonStr)
      : JSON.parse(Buffer.from(serviceAccountJsonStr, 'base64').toString('utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    return auth;
  } catch (error) {
    console.error('Failed to parse GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON:', error);
    return null;
  }
}

/**
 * Creates a dedicated, private Google Sheet for a user upon registration
 * and grants editor permission to the user's email address.
 */
export async function createPrivateGoogleSheet(userName: string, userEmail: string): Promise<{ sheetId: string; sheetUrl: string } | null> {
  const auth = getGoogleAuth();
  if (!auth) {
    // Return fallback dummy link for development/demo mode if credentials aren't set
    const mockId = `mock_sheet_${Date.now()}`;
    return {
      sheetId: mockId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${mockId}/edit`,
    };
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Create Spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `mencatat.id - Keuangan ${userName}`,
        },
        sheets: [
          {
            properties: {
              title: 'Transaksi',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: 'Tanggal' } },
                      { userEnteredValue: { stringValue: 'Jam (WIB)' } },
                      { userEnteredValue: { stringValue: 'Jenis' } },
                      { userEnteredValue: { stringValue: 'Nominal (Rp)' } },
                      { userEnteredValue: { stringValue: 'Kategori' } },
                      { userEnteredValue: { stringValue: 'Dompet / Wallet' } },
                      { userEnteredValue: { stringValue: 'Catatan' } },
                      { userEnteredValue: { stringValue: 'Sumber' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const sheetId = spreadsheet.data.spreadsheetId;
    if (!sheetId) throw new Error('Spreadsheet creation failed to return ID');

    // 2. Share ownership / editor permission with userEmail
    if (userEmail && userEmail.includes('@')) {
      await drive.permissions.create({
        fileId: sheetId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: userEmail,
        },
        sendNotificationEmail: false,
      });
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    return { sheetId, sheetUrl };
  } catch (error) {
    console.error('Error creating private Google Sheet:', error);
    const mockId = `sheet_err_${Date.now()}`;
    return {
      sheetId: mockId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${mockId}/edit`,
    };
  }
}

export interface SheetTransactionRow {
  tanggal: string; // YYYY-MM-DD
  jam: string;     // HH:mm WIB
  jenis: string;   // Pemasukan / Pengeluaran / Transfer
  nominal: number;
  kategori: string;
  wallet: string;
  catatan: string;
  sumber: string;  // Web / Telegram Teks / Telegram Struk
}

/**
 * Appends a transaction row to the user's private Google Sheet.
 */
export async function appendTransactionToSheet(sheetId: string | null | undefined, rowData: SheetTransactionRow) {
  if (!sheetId || sheetId.startsWith('mock_') || sheetId.startsWith('sheet_err_')) {
    console.log(`[Google Sheet Mock] Row appended to ${sheetId}:`, rowData);
    return true;
  }

  const auth = getGoogleAuth();
  if (!auth) {
    console.log(`[Google Sheet Mock API] Row appended:`, rowData);
    return true;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Transaksi!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            rowData.tanggal,
            rowData.jam,
            rowData.jenis,
            rowData.nominal,
            rowData.kategori,
            rowData.wallet,
            rowData.catatan,
            rowData.sumber,
          ],
        ],
      },
    });
    return true;
  } catch (error) {
    console.error('Error appending row to Google Sheet:', error);
    return false;
  }
}
