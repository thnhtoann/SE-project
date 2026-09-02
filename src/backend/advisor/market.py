"""Local market context via Gemini's "Grounding with Google Search" tool.

Uses the native google-genai SDK (not the langchain-google-genai wrapper used
elsewhere in this app) because Google Search grounding is configured through
a client/tool shape that's specific to this SDK and best matched against
Google's own docs directly: https://ai.google.dev/gemini-api/docs/google-search

TODO: this is unverified against a live API key/network call (none available
in this sandbox) -- run one real query against GOOGLE_API_KEY before relying
on it, and re-check the exact tool/config shape against the current
google-genai release if it errors (this is a fast-moving SDK).
"""
from django.conf import settings
from google import genai
from google.genai import types

# This node's output is explicitly advisory/unverified (see graph.py's
# generate_insights prompt), so a search failure should degrade gracefully
# rather than fail the whole analysis.
MARKET_CONTEXT_UNAVAILABLE = ''


def fetch_market_context(store_location, period):
    if not settings.GOOGLE_API_KEY:
        return MARKET_CONTEXT_UNAVAILABLE
    if not store_location:
        return MARKET_CONTEXT_UNAVAILABLE

    query = (
        f"Xu hướng tiêu dùng bán lẻ, sự kiện, mùa vụ đáng chú ý gần đây "
        f"ảnh hưởng đến cửa hàng tạp hoá/tiện lợi tại khu vực '{store_location}' "
        f"trong {period} này. Trả lời ngắn gọn bằng tiếng Việt, tối đa 5 gạch đầu dòng."
    )

    try:
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=query,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )
        return (response.text or '').strip()
    except Exception as exc:  # noqa: BLE001 -- market context is best-effort, never fatal
        return f'{MARKET_CONTEXT_UNAVAILABLE} (market search failed: {exc})'
