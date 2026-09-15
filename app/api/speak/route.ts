function bostonizeForSpeech(input: string) {
  let text = String(input || "");

  const replacements: Array<[RegExp, string]> = [
    [/\bcars\b/gi, "cahs"],
    [/\bcar\b/gi, "cah"],

    [/\bparking\b/gi, "pahkin'"],
    [/\bparked\b/gi, "pahked"],
    [/\bpark\b/gi, "pahk"],

    [/\bbars\b/gi, "bahs"],
    [/\bbar\b/gi, "bah"],

    [/\bharder\b/gi, "hahdah"],
    [/\bhard\b/gi, "hahd"],

    [/\byards\b/gi, "yahds"],
    [/\byard\b/gi, "yahd"],

    [/\bstarted\b/gi, "stahted"],
    [/\bstarting\b/gi, "stahtin'"],
    [/\bstart\b/gi, "staht"],

    [/\bsmart\b/gi, "smaht"],
    [/\bparty\b/gi, "pahty"],
    [/\bfar\b/gi, "fah"],
    [/\bstar\b/gi, "stah"],

    [/\bmarket\b/gi, "mahket"],
    [/\bgarbage\b/gi, "gahbage"],

    [/\bhere\b/gi, "heah"],
    [/\bthere\b/gi, "theah"],
    [/\bwhere\b/gi, "wheah"],
    [/\bmore\b/gi, "moah"],
    [/\bfour\b/gi, "foah"],
    [/\bdoor\b/gi, "doah"],

    [/\bbastard\b/gi, "bahstahd"],

    [/\bmotherfucking\b/gi, "muthafuckin'"],
    [/\bmotherfucker\b/gi, "muthafuckah"],
    [/\bfucking\b/gi, "fuckin'"],
    [/\bfucker\b/gi, "fuckah"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const spokenText = bostonizeForSpeech(text);

    const response = await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: "marin",
          input: spokenText,
          instructions: `
Speak as a foul-mouthed woman from Boston with a strong,
obvious Eastern New England accent.

Keep the Boston accent strong for the entire response.

Sound casual, fast, sarcastic, confident and funny.
Think neighborhood Boston bar, not customer service.

Drop R sounds naturally.
Lean into the Boston vowel sounds already written phonetically
in the supplied speech text.

Profanity should sound natural, confident and completely
unembarrassed. Never sanitize fuck, shit, bitch, asshole,
motherfucker or similar language when it appears.

Do not sound polished, corporate, robotic or overly cheerful.
Do not turn it into a cartoon impression.
She should sound like Boston is genuinely where she is from.
          `.trim(),
          format: "mp3",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Voice generation failed");
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (e) {
    return new Response("Voice failed", { status: 500 });
  }
}
