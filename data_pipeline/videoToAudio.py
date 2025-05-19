import os
import gdown

google_drive_links = [
    {"name": "Introduction", "link": "https://drive.google.com/file/d/1Vn_kNSduaUpJ7mI3VDIMshrsWfDV8cZ4/view"},
]

video_dir = 'videos'
audio_dir = 'audios'

os.makedirs(video_dir, exist_ok=True)
os.makedirs(audio_dir, exist_ok=True)

def download_video_and_convert_to_audio(name, link):

    file_id = link.split('/')[5]
    direct_link = f'https://drive.google.com/uc?id={file_id}'


    video_file = os.path.join(video_dir, f'{name}.mp4')
    audio_file = os.path.join(audio_dir, f'{name}.mp3')

    print(f'Downloading {name}...')
    gdown.download(direct_link, video_file, quiet=False)
    

    print(f'Converting {name} to audio...')
    os.system(f'ffmpeg -i "{video_file}" -q:a 0 -map a "{audio_file}"')
    
    print(f'Audio file saved as {audio_file}')


for item in google_drive_links:
    download_video_and_convert_to_audio(item["name"], item["link"])

print('All videos have been processed.')
