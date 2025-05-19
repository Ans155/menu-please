#!/usr/bin/env python3
import sys
import json
import os
from paddleocr import PaddleOCR

def extract_text(image_path):
    """
    Extract text from an image using PaddleOCR
    """
    try:
        # Initialize PaddleOCR with English language
        ocr = PaddleOCR(use_angle_cls=True, lang='en')
        
        # Perform OCR on the image
        result = ocr.ocr(image_path, cls=True)
        
        # Extract text from the result
        full_text = ""
        for idx in range(len(result)):
            res = result[idx]
            for line in res:
                full_text += line[1][0] + " "
        
        # Return JSON with the extracted text
        return json.dumps({"text": full_text.strip()})
        
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    # Check if image path is provided
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Image path not provided"}))
        sys.exit(1)
        
    # Get image path from command line arguments
    image_path = sys.argv[1]
    
    # Check if the file exists
    if not os.path.isfile(image_path):
        print(json.dumps({"error": f"File {image_path} does not exist"}))
        sys.exit(1)
    
    # Extract text and print the result
    print(extract_text(image_path))