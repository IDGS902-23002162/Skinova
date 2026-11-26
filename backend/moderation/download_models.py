"""Install pinned public weights for local forum image moderation."""
from hashlib import sha256
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.request import urlopen


MODEL_DIRECTORY = Path(__file__).resolve().parent / 'models'
STEALTHBOX = 'Stealthbox/stealthbox-onnx-models/resolve/59f1d98cfeb3ca6448f82cd8de07e5e52af5d6d9'
IMAGE_SAFETY = 'OwenElliott/image-safety-classifier-xs/resolve/2b33625727f94d117e9896bec2521d8fa030caa2'
MODEL_HASHES = {
    'gore': 'ca3a6bb04ba55414a07a69975a6bee67bf291bff11a1b7c015bbf240d3498d81',
    'violence': '1307be86fe7607e131e45fdf1cd429c20d8a110074658903f4a4d802ce3fadda',
    'weapons': 'fb62f40cc41396d3f8753c39523c59c2d6ab50f7760ed2215fe26ba28b25a02d',
    'hate_symbols': '0d8c850e0b3dfa03eaa2e3a0c3ca77d30532c94b957d1e7054d740af4345c6e1',
}


def install_models():
    MODEL_DIRECTORY.mkdir(exist_ok=True)
    artifacts = [(f'{name}.onnx', f'{STEALTHBOX}/{name}.onnx', checksum)
                 for name, checksum in MODEL_HASHES.items()]
    artifacts.append((
        'image-safety-classifier-xs.onnx', f'{IMAGE_SAFETY}/onnx/image-safety-classifier-xs.onnx',
        '8c28c49d9075f3ad15ebdc2961f02d5b3f99be944815b848b49c9f0e6f3fb689',
    ))
    for filename, path, expected_hash in artifacts:
        target = MODEL_DIRECTORY / filename
        if target.exists() and sha256(target.read_bytes()).hexdigest() == expected_hash:
            continue
        url = f'https://huggingface.co/{path}'
        with urlopen(url, timeout=30) as response:
            data = response.read(15_000_001)
        if sha256(data).hexdigest() != expected_hash:
            raise ValueError(f'Checksum mismatch for {target.name}')
        with NamedTemporaryFile(dir=MODEL_DIRECTORY, delete=False) as temporary:
            temp_path = Path(temporary.name)
            temporary.write(data)
        try:
            temp_path.replace(target)
        finally:
            temp_path.unlink(missing_ok=True)
        print(f'Installed {target.name}')


if __name__ == '__main__':
    install_models()
