"""
Sends email via Resend's HTTPS API (https://resend.com) instead of SMTP.

Railway's Free/Trial/Hobby plans block outbound SMTP entirely (see
https://docs.railway.com/networking/outbound-networking#email-delivery) --
connections to an SMTP host just hang until a TCP-level timeout (observed:
20-130s) and then fail, which is exactly what OTP emails looked like before
this backend existed. Resend (and any HTTPS-API transactional email
service -- Railway's docs also list SendGrid/Mailgun/Postmark) works on
every plan since it's a plain HTTPS POST, not a raw SMTP connection.

Selected automatically by RESEND_API_KEY in config/settings.py; falls back
to real SMTP or the console backend if unset -- see the settings.py
comment next to EMAIL_BACKEND for the full fallback order.
"""
import logging

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        if not settings.RESEND_API_KEY:
            if not self.fail_silently:
                raise ValueError("RESEND_API_KEY is not configured.")
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                response = requests.post(
                    RESEND_API_URL,
                    headers={'Authorization': f'Bearer {settings.RESEND_API_KEY}'},
                    json={
                        'from': message.from_email,
                        'to': list(message.to),
                        'subject': message.subject,
                        'text': message.body,
                    },
                    timeout=10,
                )
                if response.status_code >= 400:
                    raise RuntimeError(f"Resend API error {response.status_code}: {response.text}")
                sent_count += 1
            except Exception:
                logger.exception("Failed to send email via Resend to %s", message.to)
                if not self.fail_silently:
                    raise
        return sent_count
