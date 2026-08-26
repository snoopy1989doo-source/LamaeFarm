import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message, token, imageBase64 } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    let response;

    if (imageBase64 && imageBase64.includes(';base64,')) {
      // Split header from base64 data
      const parts = imageBase64.split(';base64,');
      const mimeType = parts[0].split(':')[1];
      const base64Data = parts[1];
      const buffer = Buffer.from(base64Data, 'base64');

      const formData = new FormData();
      formData.append('message', message);

      // Create a Blob from the buffer
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('imageFile', blob, 'receipt.jpg');

      response = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    } else {
      const formData = new URLSearchParams();
      formData.append('message', message);

      response = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `LINE Notify Error: ${errText}` }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
