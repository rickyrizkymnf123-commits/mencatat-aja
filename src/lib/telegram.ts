export async function sendMessage(token: string, chatId: number | string, text: string, replyMarkup?: any): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      }),
    });
    if (!response.ok) {
      console.error(`Telegram sendMessage failed: ${response.statusText}`, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error sending message:', err);
    return false;
  }
}

export async function getFile(token: string, fileId: string): Promise<string> {
  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Telegram getFile failed: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.ok || !data.result.file_path) {
    throw new Error('Telegram getFile returned invalid output');
  }
  return data.result.file_path;
}

export async function downloadFile(token: string, filePath: string): Promise<Buffer> {
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Telegram downloadFile failed: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
