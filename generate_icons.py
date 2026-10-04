from PIL import Image
import os

source_file = r"c:\Users\Administrator\Documents\Skinova\frontend\src\assets\nuevo-logo.png"
output_dir = r"c:\Users\Administrator\Documents\Skinova\frontend\public"

def create_square_icon(img, target_size, padding_factor=1.0):
    width, height = img.size
    # Determine the size of the box based on max dimension and padding
    max_dim = int(max(width, height) * padding_factor)
    
    # Create a new square image with transparent background
    square_img = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    # Calculate position to paste the original image
    paste_pos = ((max_dim - width) // 2, (max_dim - height) // 2)
    square_img.paste(img, paste_pos)
    
    # Now resize the square image to the target size
    resized = square_img.resize((target_size, target_size), Image.Resampling.LANCZOS)
    return resized

def generate():
    img = Image.open(source_file).convert("RGBA")
    
    # Standard sizes
    sizes = [
        (16, "favicon-16x16.png", 1.0),
        (32, "favicon-32x32.png", 1.0),
        (64, "favicon-64x64.png", 1.0),
        (180, "apple-touch-icon.png", 1.1), # Slight padding for Apple
        (192, "pwa-192x192.png", 1.0),
        (512, "pwa-512x512.png", 1.0),
        (512, "maskable-icon-512x512.png", 1.3), # More padding for maskable icons
    ]
    
    for size, filename, padding in sizes:
        icon = create_square_icon(img, size, padding)
        icon.save(os.path.join(output_dir, filename))
        
    # generate ICO (can include multiple sizes, but let's just do 32x32 for simplicity or let PIL handle it)
    icon_16 = create_square_icon(img, 16)
    icon_32 = create_square_icon(img, 32)
    icon_48 = create_square_icon(img, 48)
    
    icon_32.save(os.path.join(output_dir, "favicon.ico"), format="ICO", sizes=[(16,16), (32,32), (48,48)])
    
    print("Icons generated successfully!")

if __name__ == '__main__':
    generate()
