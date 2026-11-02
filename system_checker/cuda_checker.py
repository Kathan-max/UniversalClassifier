import torch
print("CUDA Available: ", torch.cuda.is_available())


if torch.cuda.is_available():
    print("Device Count: ", torch.cuda.device_count())
    print("Device Name: ", torch.cuda.get_device_name(0))
    print("CUDA Version (torch): ", torch.version.cuda)
    print("VRAM (GB): ", round(torch.cuda.get_device_properties(0).total_memory / 1e9, 2))