# README.md
# 🎨 Custom QR Code Generator

A modern, cross-platform desktop application for generating customized QR codes with logos and styling options.

## ✨ Features

- Convert URLs to QR codes instantly
- Customize QR code colors and style
- Add custom logos to QR codes
- Multiple styling options:
  - Square or round dots
  - Adjustable size
  - Custom colors
  - Error correction levels
  - Logo size and background
- Cross-platform support (Windows, macOS, Linux)
- Modern, user-friendly interface

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup
1. Clone the repository:
```bash
git clone https://github.com/CreativeAcer/qr-code-local
cd qr-code-local
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

### Building Executables
To create executable files for different platforms:

```bash
# Build for all platforms
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

⚠️ Note: Building for macOS requires a Mac machine.

## 🛠️ Development

### Project Structure
```
custom-qr-generator/
├── src/
│   ├── main.js        # Main electron process
│   └── index.html     # Application UI
├── package.json       # Project configuration
└── README.md         # This file
```

### Available Scripts
- `npm start` - Start the application in development mode
- `npm run build` - Build executables for all platforms
- `npm run build:win` - Build for Windows
- `npm run build:mac` - Build for macOS
- `npm run build:linux` - Build for Linux

## 📝 Configuration Options

### QR Code Options
- **Style**: Choose between square (traditional) or round dots
- **Error Correction**: Select error correction level (L, M, Q, H)
- **Size**: Adjust QR code size (100px to 400px)
- **Colors**: Customize QR code and background colors

### Logo Options
- **Size**: Adjust logo size (10% to 30% of QR code)
- **Background**: Choose between colored or transparent background
- **Position**: Automatically centered in QR code

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
