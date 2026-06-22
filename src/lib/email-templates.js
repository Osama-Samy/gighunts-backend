/**
 * @typedef {Object} OtpEmailTemplateOptions
 * @property {string} title
 * @property {string} heading
 * @property {string} recipientName
 * @property {string} intro
 * @property {string} otpCode
 * @property {string} validFor
 * @property {string} note
 */

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {OtpEmailTemplateOptions} options
 */
export function buildOtpEmailTemplate(options) {
  const title = escapeHtml(options.title);
  const heading = escapeHtml(options.heading);
  const recipientName = escapeHtml(options.recipientName);
  const intro = escapeHtml(options.intro);
  const otpCode = escapeHtml(options.otpCode);
  const validFor = escapeHtml(options.validFor);
  const note = escapeHtml(options.note);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #f2f4f8;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
        }

        .email-wrapper {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
        }

        .email-header {
          background: linear-gradient(90deg, #0066ff, #3f9fff);
          padding: 30px;
          text-align: center;
          color: #ffffff;
        }

        .email-header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .email-body {
          padding: 30px;
        }

        .email-body p {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .verification-box {
          background: #f0f4ff;
          color: #003366;
          border: 2px dashed #0056b3;
          font-size: 24px;
          text-align: center;
          font-weight: bold;
          padding: 20px;
          border-radius: 10px;
          margin: 30px 0;
          letter-spacing: 2px;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-header">
          <p style="margin: 0; font-size: 22px; font-weight: 700; opacity: 0.98;">GigHunts</p>
          <h1>${heading}</h1>
        </div>
        <div class="email-body">
          <p>Hi <strong>${recipientName}</strong>,</p>
          <p>${intro}</p>
          <div class="verification-box">${otpCode}</div>
          <p><strong>⏱️ Code valid for 5 minutes:</strong> ${validFor} ${note}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `GigHunts\n\nHi ${options.recipientName},\n\n${options.intro}\n\nCode: ${options.otpCode}\n\n⏱️ Code valid for 5 minutes: ${options.validFor} ${options.note}`;

  return {
    html,
    text,
  };
}
