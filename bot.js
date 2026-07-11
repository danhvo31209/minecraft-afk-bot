const mineflayer = require('mineflayer');
const express = require('express');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Đọc file cấu hình config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

app.get('/', (req, res) => {
  res.send('Bot Minecraft AFK đang chạy trực tuyến!');
});

app.listen(port, () => {
  console.log(`Server đang lắng nghe tại port ${port}`);
});

function createBot() {
  const bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    version: false // Tự động nhận diện phiên bản server
  });

  bot.on('spawn', () => {
    console.log(`${bot.username} đã vào server thành công!`);
    bot.chat('/register MatKhau123 MatKhau123'); // Tự động đăng ký nếu cần
    bot.chat('/login MatKhau123'); // Tự động đăng nhập nếu cần
    
    // Kích hoạt tính năng random di chuyển chống AFK kíck
    startRandomAFK(bot);
  });

  bot.on('end', () => {
    console.log('Bot bị mất kết nối, đang tiến hành kết nối lại sau 5 giây...');
    setTimeout(createBot, 5000);
  });

  bot.on('error', (err) => {
    console.log('Lỗi Bot:', err);
  });
}

// Hàm xử lý hành động ngẫu nhiên cho Bot
function startRandomAFK(bot) {
  setInterval(() => {
    if (!bot.entity) return;

    const actions = ['forward', 'back', 'left', 'right', 'jump', 'look'];
    // Chọn ngẫu nhiên 1 hành động trong danh sách trên
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    console.log(`[AFK] Bot đang thực hiện hành động ngẫu nhiên: ${randomAction}`);

    if (randomAction === 'look') {
      // Xoay hướng nhìn ngẫu nhiên
      const yaw = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI * 0.5;
      bot.look(yaw, pitch);
    } else if (randomAction === 'jump') {
      // Nhảy lên 1 cái
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    } else {
      // Di chuyển (tiến/lùi/trái/phải) trong vòng 1 giây rồi dừng lại
      bot.setControlState(randomAction, true);
      setTimeout(() => bot.setControlState(randomAction, false), 1000);
    }

  }, Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000); 
  // Thời gian lặp lại ngẫu nhiên trong khoảng từ 10 đến 20 giây một lần
}

createBot();
