import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Valkyrie Shop • Premium Tokens & Tools",
  description: "Trang web cung cấp dịch vụ Token và Tool tự động, an toàn và chuyên nghiệp nhất thị trường.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#080b16] text-[#f8fafc] selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}

        {/* ============================================
            ANTI-DEVTOOLS & ANTI-SCRAPING PROTECTION
            Chống xem source, chống scrape, chống DevTools
        ============================================ */}
        <Script id="security-shield" strategy="afterInteractive">{`
          (function() {
            'use strict';

            // === 1. Disable Right Click ===
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              return false;
            });

            // === 2. Disable Keyboard Shortcuts for Source Viewing ===
            document.addEventListener('keydown', function(e) {
              const key = e.key || e.keyCode;

              // Block F12 (DevTools)
              if (e.key === 'F12') { e.preventDefault(); return false; }

              // Block Ctrl+Shift+I (DevTools)
              if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); return false; }

              // Block Ctrl+Shift+J (Console)
              if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); return false; }

              // Block Ctrl+Shift+C (Inspector)
              if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); return false; }

              // Block Ctrl+U (View Source)
              if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); return false; }

              // Block Ctrl+S (Save Page)
              if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); return false; }

              // Block Ctrl+A (Select All)
              if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); return false; }
            });

            // === 3. Clear Console and show warning ===
            const clearConsole = function() {
              console.clear();
              console.log('%c⚠️ CẢNH BÁO BẢO MẬT', 'color: red; font-size: 30px; font-weight: bold;');
              console.log('%cKhu vực này dành cho nhà phát triển. Nếu ai đó bảo bạn nhập/dán gì đó vào đây, đó là lừa đảo!', 'color: orange; font-size: 14px;');
              console.log('%cValkyrie Shop © 2026 - All rights reserved.', 'color: gray; font-size: 12px;');
            };
            clearConsole();
            setInterval(clearConsole, 2000);

            // === 4. DevTools Detection (size-based) ===
            const devToolsThreshold = 160;
            let devToolsOpen = false;

            const checkDevTools = function() {
              const widthDiff = window.outerWidth - window.innerWidth;
              const heightDiff = window.outerHeight - window.innerHeight;
              const isOpen = widthDiff > devToolsThreshold || heightDiff > devToolsThreshold;

              if (isOpen && !devToolsOpen) {
                devToolsOpen = true;
                document.body.style.filter = 'blur(10px)';
                document.body.style.pointerEvents = 'none';
                
                // Show overlay warning
                const overlay = document.createElement('div');
                overlay.id = 'devtools-warning';
                overlay.style.cssText = [
                  'position:fixed', 'top:0', 'left:0', 'width:100vw', 'height:100vh',
                  'background:rgba(0,0,0,0.95)', 'z-index:99999',
                  'display:flex', 'flex-direction:column',
                  'align-items:center', 'justify-content:center',
                  'color:white', 'font-family:sans-serif'
                ].join(';');
                overlay.innerHTML = '<div style="text-align:center;padding:40px;border:2px solid #ef4444;border-radius:16px;max-width:500px">' +
                  '<div style="font-size:60px">🛡️</div>' +
                  '<h2 style="color:#ef4444;margin:16px 0">Phát hiện DevTools!</h2>' +
                  '<p style="color:#aaa;line-height:1.6">Trang web này được bảo vệ bởi hệ thống bảo mật.<br>Vui lòng đóng DevTools để tiếp tục sử dụng.</p>' +
                  '</div>';
                document.body.appendChild(overlay);
              } else if (!isOpen && devToolsOpen) {
                devToolsOpen = false;
                document.body.style.filter = '';
                document.body.style.pointerEvents = '';
                const overlay = document.getElementById('devtools-warning');
                if (overlay) overlay.remove();
              }
            };

            setInterval(checkDevTools, 500);

            // === 5. Disable Text Selection on sensitive elements ===
            document.addEventListener('selectstart', function(e) {
              if (e.target.closest('[data-no-select]')) {
                e.preventDefault();
              }
            });

            // === 6. Disable Drag ===
            document.addEventListener('dragstart', function(e) {
              e.preventDefault();
            });

          })();
        `}</Script>
      </body>
    </html>
  );
}
