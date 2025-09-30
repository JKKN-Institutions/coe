import { createClient } from '@supabase/supabase-js'

interface SendWelcomeEmailParams {
  to: string
  name: string
  loginUrl: string
  temporaryPassword?: string
}

export async function sendWelcomeEmail({ to, name, loginUrl, temporaryPassword }: SendWelcomeEmailParams) {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Email service not configured. Supabase credentials missing.')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Send email using Supabase Edge Function or direct SMTP
    const emailHtml = generateWelcomeEmailHTML(name, loginUrl, temporaryPassword)

    // Call Supabase Edge Function for sending email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject: 'Welcome to JKKN College of Engineering - Your Account is Ready',
        html: emailHtml,
      },
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully via Supabase')
    return { success: true, data }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function generateWelcomeEmailHTML(name: string, loginUrl: string, temporaryPassword?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to JKKN COE</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Welcome to JKKN COE</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Your account has been created successfully</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${name},</h2>

              <p style="margin: 0 0 15px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Your account has been created on the JKKN College of Engineering portal. You can now access the system using your credentials.
              </p>

              ${temporaryPassword ? `
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #333333; font-weight: bold;">Your Login Credentials:</p>
                <p style="margin: 5px 0; color: #666666;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
                <p style="margin: 10px 0 0 0; color: #dc3545; font-size: 14px;">
                  <strong>Important:</strong> Please change your password after your first login.
                </p>
              </div>
              ` : ''}

              <div style="margin: 30px 0; text-align: center;">
                <a href="${loginUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>

              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                If you have any questions or need assistance, please contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                JKKN College of Engineering
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}