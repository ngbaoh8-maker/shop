const DISCORD_API_VERSION = 'v10';

async function callDiscordAPI(endpoint, method = 'GET', body = null) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.warn('[Discord REST] DISCORD_TOKEN is not configured.');
    return null;
  }

  const url = `https://discord.com/api/${DISCORD_API_VERSION}${endpoint}`;
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Discord REST Error] Status: ${res.status}`, errText);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('[Discord REST Exception]', err);
    return null;
  }
}

export async function sendOrderNotification(order, username, toolName = '') {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) {
    console.warn('[Discord REST] DISCORD_CHANNEL_ID is not configured.');
    return null;
  }

  const title = order.type === 'TOKEN' ? '🛒 ĐƠN HÀNG MUA TOKEN MỚI' : '🛒 ĐƠN HÀNG MUA TOOL MỚI';
  const color = 6502129; // Hex #6366F1 converted to decimal integer (6502129)

  const fields = [
    { name: 'Mã Đơn Hàng', value: `\`${order.id}\``, inline: true },
    { name: 'Khách Hàng', value: `\`${username}\``, inline: true },
    { name: 'Loại Dịch Vụ', value: `\`${order.type}\``, inline: true },
    { name: 'Nội Dung Chuyển Khoản', value: `\`${order.transferMessage}\``, inline: false }
  ];

  if (order.type === 'TOKEN') {
    fields.push(
      { name: 'Số Lượng Token', value: `${order.quantity.toLocaleString()} Token`, inline: true },
      { name: 'Đơn Giá', value: '800 VNĐ / Token', inline: true },
      { name: 'Tổng Tiền', value: `**${order.totalAmount.toLocaleString()} VNĐ**`, inline: true }
    );
  } else {
    fields.push(
      { name: 'Tên Tool', value: `**${toolName || 'Không rõ'}**`, inline: true },
      { name: 'Tổng Tiền', value: `**${order.totalAmount.toLocaleString()} VNĐ**`, inline: true }
    );
  }

  fields.push({
    name: 'Thời Gian Tạo',
    value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:F>`,
    inline: false
  });

  const embed = {
    title,
    color,
    fields,
    footer: { text: 'Hệ Thống Bán Hàng Tự Động • SaaS 2026' }
  };

  const body = {
    embeds: [embed],
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 3, // SUCCESS (Green)
            label: 'Duyệt',
            custom_id: `approve_${order.id}`
          },
          {
            type: 2, // BUTTON
            style: 4, // DANGER (Red)
            label: 'Không Duyệt',
            custom_id: `reject_${order.id}`
          }
        ]
      }
    ]
  };

  const response = await callDiscordAPI(`/channels/${channelId}/messages`, 'POST', body);
  return response ? response.id : null;
}

export async function updateOrderNotification(order, username, status, toolName = '') {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId || !order.discordMsgId) return;

  const color = status === 'APPROVED' ? 1089901 : 16190508; // Success green (#10B981 = 1089901) or Danger red (#EF4444 = 16190508)
  const statusLabel = status === 'APPROVED' ? '✅ ĐÃ DUYỆT' : '❌ ĐÃ TỪ CHỐI';

  const fields = [
    { name: 'Mã Đơn Hàng', value: `\`${order.id}\``, inline: true },
    { name: 'Khách Hàng', value: `\`${username}\``, inline: true },
    { name: 'Trạng Thái', value: `**${statusLabel}**`, inline: true },
  ];

  if (order.type === 'TOKEN') {
    fields.push(
      { name: 'Số Lượng Token', value: `${order.quantity.toLocaleString()} Token`, inline: true },
      { name: 'Tổng Tiền', value: `**${order.totalAmount.toLocaleString()} VNĐ**`, inline: true }
    );
  } else {
    fields.push(
      { name: 'Tên Tool', value: `**${toolName || 'Không rõ'}**`, inline: true },
      { name: 'Tổng Tiền', value: `**${order.totalAmount.toLocaleString()} VNĐ**`, inline: true }
    );
  }

  const embed = {
    title: `🛒 ĐƠN HÀNG ${order.id} ${statusLabel}`,
    color,
    fields,
    footer: { text: 'Hệ Thống Bán Hàng Tự Động • SaaS 2026' }
  };

  // Update message and REMOVE action buttons
  await callDiscordAPI(`/channels/${channelId}/messages/${order.discordMsgId}`, 'PATCH', {
    embeds: [embed],
    components: [] // Removes buttons
  });
}
