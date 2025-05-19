import locale
import whisper
import numpy as np
import os
from concurrent.futures import ThreadPoolExecutor

def pad_or_trim(audio, length):
    if len(audio) > length:
        return audio[:length]
    else:
        return np.pad(audio, (0, length - len(audio)))

# Function to transcribe a segment of audio
def transcribe_segment(segment, model, segment_length):
    segment = pad_or_trim(segment, segment_length)
    mel = whisper.log_mel_spectrogram(segment).to(model.device)
    options = whisper.DecodingOptions()
    result = whisper.decode(model, mel, options)
    return result.text

def transcribe_audio_file(audio_path, model, segment_length):
    audio = whisper.load_audio(audio_path)
    

    transcriptions = []
    for i in range(0, len(audio), segment_length):
        segment = audio[i:i + segment_length]
        transcription = transcribe_segment(segment, model, segment_length)
        transcriptions.append(transcription)
    
    full_transcription = " ".join(transcriptions)
    return full_transcription


def is_audio_file(file_path):
    audio_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.wma']
    return any(file_path.lower().endswith(ext) for ext in audio_extensions)


def process_audio_file(audio_file, audio_folder, output_folder, model, segment_length):
    audio_path = os.path.join(audio_folder, audio_file)
    if not os.path.isfile(audio_path) or not is_audio_file(audio_path):
        return
    
    print(f"Processing {audio_file}...")
    transcription = transcribe_audio_file(audio_path, model, segment_length)
    
    output_path = os.path.join(output_folder, f"{os.path.splitext(audio_file)[0]}.txt")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(transcription)
    
    print(f"Transcription for {audio_file} saved to {output_path}")

def main():
    audio_folder = "audio"
    output_folder = "transcribed_text"
    os.makedirs(output_folder, exist_ok=True)
    

    model = whisper.load_model("base")
    segment_length = 30 * 16000  # 30 seconds
    
    audio_files = [f for f in os.listdir(audio_folder) if is_audio_file(os.path.join(audio_folder, f))]
    
    # Process each audio file in the audio folder using multithreading
    with ThreadPoolExecutor() as executor:
        for audio_file in audio_files:
            executor.submit(process_audio_file, audio_file, audio_folder, output_folder, model, segment_length)

if __name__ == "__main__":
    main()
