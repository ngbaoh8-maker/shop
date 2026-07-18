const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Store active approval sessions in memory: adminId -> { orderId, messageId, originalInteraction }
const activeTokenApprovals = new Map();

client.once('ready', () => {
  console.log(`[Discord Bot] Đăng nhập thành công với tên: ${client.user.tag}`);
});

// Download helper
const downloadFile = (url, destPath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
};

// Send Order Embed
async function sendOrderNotification(order, username) {
  try {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel) {
      console.error('[Discord Bot] Không tìm thấy kênh Discord.');
      return null;
    }

    const title = order.type === 'TOKEN' ? '🛒 ĐƠN HÀNG MUA TOKEN MỚI' : '🛒 ĐƠN HÀNG MUA TOOL MỚI';
    const color = 0x6366F1; // Premium purple

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .addFields(
        { name: 'Mã Đơn Hàng', value: `\`${order.id}\``, inline: true },
        { name: 'Khách Hàng', value: `\`${username}\``, inline: true },
        { name: 'Loại Dịch Vụ', value: `\`${order.type}\``, inline: true },
        { name: 'Nội Dung Chuyển Khoản', value: `\`${order.transferMessage}\``, inline: false }
      );

    if (order.type === 'TOKEN') {
      embed.addFields(
        { name: 'Số Lượng Token', value: `${order.quantity.toLocaleString()} Token`, inline: true },
        { name: 'Đơn Giá', value: '800 VNĐ / Token', inline: true },
        { name: 'Tổng Tiền', value: `**${order.totalAmount.toLocaleString()} VNĐ**`, inline: true }
      );
    } else {
      // It's a TOOL
      const tool = await prisma.tool.findUnique({ where: { id: order.toolId } });
      embed.addFields(
        { name: 'Tên Tool', value: `**${tool ? tool.name : 'Không rõ'}**`, inline: true },
        { name: 'Tổng Tiền', value: `**${order.totalAmount.toLocaleString()} VNĐ**`, inline: true }
      );
    }

    embed.addFields({ name: 'Thời Gian Tạo', value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:F>`, inline: false });
    embed.setFooter({ text: 'Hệ Thống Bán Hàng Tự Động • SaaS 2026' });

    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_${order.id}`)
        .setLabel('Duyệt')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_${order.id}`)
        .setLabel('Không Duyệt')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await channel.send({ embeds: [embed], components: [row] });
    
    // Save Message ID in Order for later editing
    await prisma.order.update({
      where: { id: order.id },
      data: { discordMsgId: message.id }
    });

    return message.id;
  } catch (error) {
    console.error('[Discord Bot] Lỗi khi gửi embed thông báo đơn hàng:', error);
    return null;
  }
}

// Handle Interaction
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, orderId] = interaction.customId.split('_');
  if (action !== 'approve' && action !== 'reject') return;

  try {
    // Fetch Order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, tool: true }
    });

    if (!order) {
      return interaction.reply({ content: 'Không tìm thấy đơn hàng này trong hệ thống.', ephemeral: true });
    }

    if (order.status !== 'PENDING') {
      return interaction.reply({ content: `Đơn hàng này đã được xử lý (Trạng thái hiện tại: ${order.status}).`, ephemeral: true });
    }

    if (action === 'reject') {
      // Reject Order
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'REJECTED' }
      });

      // Update Discord message
      const receivedEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(receivedEmbed)
        .setColor(0xEF4444) // Red
        .setTitle(`❌ ĐƠN HÀNG ĐÃ BỊ TỪ CHỐI`)
        .addFields({ name: 'Trạng Thái', value: `🔴 Đã Từ Chối bởi Admin <@${interaction.user.id}>` });

      await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
      await prisma.log.create({
        data: {
          userId: order.userId,
          action: 'ORDER_REJECTED',
          details: `Đơn hàng ${order.id} đã bị từ chối bởi Discord Admin ${interaction.user.tag}`
        }
      });

      return interaction.reply({ content: `Đơn hàng ${orderId} đã được từ chối thành công.`, ephemeral: true });
    }

    if (action === 'approve') {
      if (order.type === 'TOKEN') {
        // Set active approval session to wait for file upload
        activeTokenApprovals.set(interaction.user.id, {
          orderId: order.id,
          channelId: interaction.channelId,
          messageId: interaction.message.id,
          originalInteraction: interaction
        });

        // Prompt user
        return interaction.reply({
          content: `📥 Vui lòng tải lên file TXT chứa Token cho đơn hàng \`${order.id}\` (Số lượng: ${order.quantity} Token) tại kênh này.`,
          ephemeral: false
        });
      } else {
        // For Tool, it's already uploaded. Just approve.
        if (!order.tool || !order.tool.fileUrl) {
          return interaction.reply({ content: 'Không tìm thấy file của Tool này trên hệ thống.', ephemeral: true });
        }

        // Set status and link file
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'APPROVED',
            fileUrl: order.tool.fileUrl
          }
        });

        // Update Discord message
        const receivedEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(receivedEmbed)
          .setColor(0x10B981) // Green
          .setTitle(`✅ ĐƠN HÀNG TOOL ĐÃ DUYỆT`)
          .addFields({ name: 'Trạng Thái', value: `🟢 Đã Duyệt bởi Admin <@${interaction.user.id}>` });

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

        await prisma.log.create({
          data: {
            userId: order.userId,
            action: 'ORDER_APPROVED',
            details: `Đơn hàng Tool ${order.id} đã được duyệt bởi Discord Admin ${interaction.user.tag}`
          }
        });

        return interaction.reply({ content: `Đơn hàng Tool ${orderId} đã duyệt thành công.`, ephemeral: true });
      }
    }
  } catch (error) {
    console.error('[Discord Bot] Lỗi xử lý nút:', error);
    return interaction.reply({ content: 'Đã xảy ra lỗi hệ thống khi xử lý yêu cầu.', ephemeral: true });
  }
});

// Listen to upload message for Token file
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const session = activeTokenApprovals.get(message.author.id);
  if (!session) return;

  // Verify that it's in the same channel
  if (message.channelId !== session.channelId) return;

  // Check for attachment
  const attachment = message.attachments.first();
  if (!attachment || !attachment.name.endsWith('.txt')) {
    return message.reply('❌ Lỗi: Bạn phải tải lên một file văn bản định dạng `.txt` chứa Token.');
  }

  try {
    const orderId = session.orderId;
    
    // Ensure dir exists
    const uploadDir = path.join(__dirname, 'uploads', 'tokens');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `token-${orderId}-${Date.now()}.txt`;
    const destPath = path.join(uploadDir, filename);

    // Download attachment
    await downloadFile(attachment.url, destPath);

    // Update database
    const relativeFileUrl = `/uploads/tokens/${filename}`;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'APPROVED',
        fileUrl: relativeFileUrl
      }
    });

    // Update Discord message
    const channel = await client.channels.fetch(session.channelId);
    const originalMessage = await channel.messages.fetch(session.messageId);
    const receivedEmbed = originalMessage.embeds[0];

    const updatedEmbed = EmbedBuilder.from(receivedEmbed)
      .setColor(0x10B981) // Green
      .setTitle(`✅ ĐƠN HÀNG TOKEN ĐÃ DUYỆT`)
      .addFields(
        { name: 'Trạng Thái', value: `🟢 Đã Duyệt bởi Admin <@${message.author.id}>` },
        { name: 'File Token', value: `\`${attachment.name}\`` }
      );

    await originalMessage.edit({ embeds: [updatedEmbed], components: [] });

    // Clean session
    activeTokenApprovals.delete(message.author.id);
    
    // Success confirmation
    await message.reply(`🎉 Đơn hàng \`${orderId}\` đã được duyệt và gán file token thành công!`);

    // Log Activity
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    await prisma.log.create({
      data: {
        userId: order.userId,
        action: 'ORDER_APPROVED',
        details: `Đơn hàng Token ${orderId} đã được duyệt bằng file: ${attachment.name} bởi Discord Admin ${message.author.tag}`
      }
    });

  } catch (error) {
    console.error('[Discord Bot] Lỗi tải file đính kèm:', error);
    message.reply('❌ Có lỗi xảy ra trong quá trình lưu file và duyệt đơn hàng.');
  }
});

// Login
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('[Discord Bot] Đăng nhập bot thất bại. Kiểm tra DISCORD_TOKEN trong .env:', err.message);
});

module.exports = {
  client,
  sendOrderNotification
};
