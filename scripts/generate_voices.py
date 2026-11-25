import asyncio
import hashlib
import json
import os
import re
import edge_tts

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES_DIR = os.path.join(ROOT_DIR, "public", "voices")
MANIFEST_TS = os.path.join(ROOT_DIR, "src", "data", "voiceManifest.ts")
TRAINS_TS = os.path.join(ROOT_DIR, "src", "data", "trains.ts")

VOICE_NAME = "ja-JP-NanamiNeural"
VOICE_PITCH = "+65Hz"
VOICE_RATE = "+5%"

NUMBER_READINGS = {
    0: "れい",
    1: "いち",
    2: "に",
    3: "さん",
    4: "よん",
    5: "ご",
    6: "ろく",
    7: "なな",
    8: "はち",
    9: "きゅう",
    10: "じゅう",
    11: "じゅういち",
    12: "じゅうに",
    13: "じゅうさん",
    14: "じゅうよん",
    15: "じゅうご",
    16: "じゅうろく",
    17: "じゅうなな",
    18: "じゅうはち",
}


def r(n: int) -> str:
    return NUMBER_READINGS.get(n, str(n))


def collect_phrases() -> list[str]:
    phrases: set[str] = set()

    # 1. Addition phrases (a in 2..9, b in 2..9, a+b in 11..18)
    for a in range(2, 10):
        for b in range(2, 10):
            if 11 <= a + b <= 18:
                cl = 10 - a
                cr = b - cl
                ans = a + b
                phrases.add(f"{r(a)} たす {r(b)}。{r(a)} は、あと いくつで じゅう に なるかな？")
                phrases.add(f"せいかい！{r(a)} と {r(cl)} で じゅう だね！")
                phrases.add("おしい！うえの わくの あいている ところを かぞえてみてね。")

                phrases.add(f"つぎは、{r(b)} を、{r(cl)} と いくつ に わけるかな？")
                phrases.add(f"すごい！{r(b)} を {r(cl)} と {r(cr)} に わけられたね！")
                phrases.add(f"おしい！{r(b)} から {r(cl)} を わけると、のこりは いくつかな？")

                phrases.add(f"{r(a)} と {r(cl)} で じゅう！じゅう と {r(cr)} で いくつかな？")
                phrases.add(f"やったー！こたえは {r(ans)}！だいせいかい！")
                phrases.add(f"おしい！じゅう の まとまり と、のこりの {r(cr)} を あわせてみよう。")

    # 2. Subtraction phrases (a in 11..18, b in 2..9, b > a-10, a-b in 2..9)
    for a in range(11, 19):
        for b in range(2, 10):
            ans = a - b
            if b > a - 10 and 2 <= ans <= 9:
                cr = a - 10
                inter = 10 - b
                phrases.add(f"{r(a)} ひく {r(b)}。{r(a)} を、じゅう と いくつ に わけるかな？")
                phrases.add(f"せいかい！{r(a)} は じゅう と {r(cr)} だね！")
                phrases.add("おしい！じゅう の まとまり の ほかに、ばらの ブロックが いくつ あるかな？")

                phrases.add(f"つぎは、じゅう から {r(b)} を ひくと いくつかな？")
                phrases.add(f"よくできたね！じゅう ひく {r(b)} は {r(inter)} だね！")
                phrases.add(f"おしい！じゅう から {r(b)} こ けした のこりを かぞえてみよう。")

                phrases.add(f"さいごだよ！のこった {r(inter)} と {r(cr)} を あわせると いくつかな？")
                phrases.add(f"やったー！こたえは {r(ans)}！だいせいかい！")
                phrases.add(f"おしい！のこった {r(inter)} こ と、{r(cr)} こ を ぜんぶ かぞえてみよう。")

    # 3. Result screen phrases (earnedMiles 0..30)
    for miles in range(0, 31):
        phrases.add(f"ぜんぶ クリアしたよ！{miles}マイル ゲット！すごいね！")

    # 4. Gacha train unlock & Zukan description phrases from trains.ts
    if os.path.exists(TRAINS_TS):
        with open(TRAINS_TS, "r", encoding="utf-8") as f:
            content = f.read()
        pairs = re.findall(r"name:\s*'([^']+)',\s*description:\s*'([^']+)'", content)
        for name, desc in pairs:
            phrases.add(f"{name} を ゲットしたよ！")
            phrases.add(f"{name}。{desc}")

    return sorted(phrases)


def make_pronounceable(text: str) -> str:
    replacements = [
        ("E956形 ALFA-X（アルファエックス）", "イーきゅうごーろくがた アルファエックス"),
        ("E10系（じき東北新幹線）", "イーじゅっけい、じき とうほくしんかんせん"),
        ("S0系（じき東海道新幹線）", "エスゼロけい、じき とうかいどうしんかんせん"),
        ("E927形 SOAR（ソアー）", "イーきゅうにーなながた ソアー"),
        ("超電導リニア L0系「M10」", "ちょうでんどうリニア エルゼロけい エムじゅう"),
        ("FV-E991系 HYBARI（ひばり）", "エフブイ イーきゅうきゅういちけい ひばり"),
        ("新型ロマンスカー 80000形", "しんがたロマンスカー はちまんがた"),
        ("新型夜行特急「ルナ・アズール」", "しんがた やこうとっきゅう ルナ・アズール"),
        ("新型ライナー「トキイロ」", "しんがたライナー トキイロ"),
        ("東武 次世代新型特急", "とうぶ じせだい しんがたとっきゅう"),
        ("N700S", "エヌななひゃくエス"),
        ("Laview（ラビュー）", "ラビュー"),
    ]
    out = text
    for src, dst in replacements:
        out = out.replace(src, dst)
    return out


async def synth_one(sem: asyncio.Semaphore, text: str, out_path: str):
    if os.path.exists(out_path) and os.path.getsize(out_path) > 500:
        return
    tts_text = make_pronounceable(text)
    async with sem:
        for attempt in range(4):
            try:
                comm = edge_tts.Communicate(
                    tts_text, VOICE_NAME, pitch=VOICE_PITCH, rate=VOICE_RATE
                )
                await comm.save(out_path)
                if os.path.getsize(out_path) > 500:
                    return
            except Exception as e:
                if attempt == 3:
                    raise e
                await asyncio.sleep(0.6 * (attempt + 1))


async def main():
    os.makedirs(VOICES_DIR, exist_ok=True)
    phrases = collect_phrases()
    print(f"Total unique phrases to synthesize: {len(phrases)}")

    sem = asyncio.Semaphore(12)
    manifest: dict[str, str] = {}
    tasks = []

    for text in phrases:
        h = hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]
        filename = f"v_{h}.mp3"
        out_path = os.path.join(VOICES_DIR, filename)
        manifest[text] = f"/voices/{filename}"
        tasks.append(synth_one(sem, text, out_path))

    await asyncio.gather(*tasks)

    ts_lines = [
        "// Auto-generated by scripts/generate_voices.py",
        "export const VOICE_MANIFEST: Record<string, string> = "
        + json.dumps(manifest, ensure_ascii=False, indent=2)
        + ";",
        "",
    ]
    with open(MANIFEST_TS, "w", encoding="utf-8") as f:
        f.write("\n".join(ts_lines))

    print(f"Done! Generated {len(manifest)} audio files and wrote {MANIFEST_TS}")


if __name__ == "__main__":
    asyncio.run(main())
