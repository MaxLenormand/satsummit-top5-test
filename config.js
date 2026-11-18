/* Crowd top-5 game: shared settings for the phone vote page (crowd/vote/) and the reveal slide (crowd/reveal/).
   Live values from the real Google Form (`python3 crowd/vote/form_ids.py <viewform-url>` prints them).
   With formAction set to the placeholder "TO"+"DO", the vote page runs dry: it logs the ballot, keeps it on the phone and shows success. */
window.CROWD_CONFIG = {
  // The form's POST endpoint: https://docs.google.com/forms/d/e/<FORM_ID>/formResponse ("viewform" swapped for "formResponse").
  formAction: "https://docs.google.com/forms/d/e/1FAIpQLScuCL3WdluWsOqfwb5LGCE4yD19xolNlJsRTzXrsapg6mZFnA/formResponse",

  // Google Form field ids, "entry.<number>", one per short-answer question titled exactly like the key.
  // rank1..rank5 hold model ids from crowd/models.json, best first.
  entries: {
    rank1: "entry.1224083048",  // model id guessed #1
    rank2: "entry.874932282",  // model id guessed #2
    rank3: "entry.132482363",  // model id guessed #3
    rank4: "entry.1527712062",  // model id guessed #4
    rank5: "entry.247129704",  // model id guessed #5
    name: "entry.442523175",   // the voter's name, trimmed, at most 30 characters
    device: "entry.1125182619"  // random id made once per phone (localStorage); the reveal keeps the last ballot per device
  },

  // Id of the Google Sheet linked to the form (from its URL: /spreadsheets/d/<sheetId>/edit). Read by the reveal slide.
  sheetId: "1jElv78R6gWOU8eOpgv-LjjMi3xoiSpGOKGJqrw4jzms",

  // Tab of that Sheet holding the responses, usually "Form Responses 1". Read by the reveal slide.
  sheetTab: "Form Responses 1",

  // TEMP public test URL (GitHub Pages). For the talk: "https://research.taylorgeospatial.org/top-5-leaderboard-satsummit-2026/",
  // then rerun `python3 crowd/site.py <site repo>` (the QR slide encodes this value).
  // Public URL of the vote page (the site root of crowd/site.py), encoded in the QR code.
  voteUrl: "https://maxlenormand.github.io/satsummit-top5-test/",

  // ISO time voting opens, e.g. "2026-11-18T09:00:00-05:00". The reveal ignores rows stamped before it (rehearsals).
  // !! SET BEFORE THE TALK to the morning of 18 Nov 2026 (just before the QR slide). This pre-talk value lets test votes count.
  startTime: "2026-11-17T00:00:00-06:00"
};
