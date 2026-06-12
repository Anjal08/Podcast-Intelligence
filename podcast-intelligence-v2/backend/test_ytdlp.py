import yt_dlp
import sys

url = "https://youtu.be/z7e7gtU3PHY?si=N2TYI5Ovll-kyTtx"

ydl_opts = {
    'format': 'bestaudio/best',
    'outtmpl': 'temp_uploads/%(id)s.%(ext)s',
    'socket_timeout': 15,
    'retries': 2,
    'nocheckcertificate': True,
    'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(url, download=True)
        print("Success!")
        print("Video ID:", info_dict.get("id"))
except Exception as e:
    print(f"Error: {e}")
