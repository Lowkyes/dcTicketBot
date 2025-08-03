// Full updated Discord bot code with admin confirmation, UI polish, and payment method selection

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
require("dotenv").config();
const fetch = require("node-fetch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

setInterval(() => {
  fetch("https://0dbe80b1-e2cc-45e8-8c26-4f0626be9e71-00-bws1c45gbkms.sisko.replit.dev/");
}, 4 * 60 * 1000);

const WEBHOOK_URL = "https://discord.com/api/webhooks/1401414474757312543/cdN6rnWZVw2FUuunLRxdOLDwXSgaDV2re0s9PtCIAF2g-lLs5qMF9YCtclJDps3hN_u_";
const QR_IMAGE = "https://cdn.discordapp.com/attachments/1401451024501313656/1401563828713426976/image.png";
const WALLET_ADDRESS = "LXDvc4mnnxepL3JvMin2EHhTfG4mUH5WCG";
const cryptoUnitPrice = 1;
const userCarts = {};

const pets = [
  {
    id: 1,
    name: "Raccoon",
    description: "Every ~15 minutes, the Raccoon duplicates a Crop and gives it to the owner.",
    price: 6.1,
    image: "https://growagardenpro.com/pets/raccoon.webp",
  },
  {
    id: 2,
    name: "Disco Bee",
    description: "Has a ~16% chance to turn a nearby fruit into Disco!",
    price: 6.1,
    image: "https://growagardenpro.com/pets/discobee.webp",
  },
  {
    id: 3,
    name: "Dragon Fly",
    description: "Every ~5 minutes, turns a random fruit Gold.",
    price: 4.5,
    image: "https://growagardenpro.com/pets/dragonfly.webp",
  },
  {
    id: 4,
    name: "Mimic",
    description: "Mimics and performs another pet's ability every ~20m.",
    price: 3.5,
    image: "https://growagardenpro.com/pets/mimicoctopus.webp",
  },
];

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const [action, userId, itemId] = interaction.customId.split("-");

  if (action === "create_ticket") {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}-${Math.floor(Math.random() * 10000)}`,
      type: 0,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ["ViewChannel"] },
        { id: interaction.user.id, allow: ["ViewChannel", "SendMessages"] },
      ],
    });

    userCarts[interaction.user.id] = [];

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [getPetsListEmbed()],
      components: [getPetsButtons(interaction.user.id)],
    });

    await interaction.reply({
      content: `✅ Ticket created: ${ticketChannel}`,
      ephemeral: true,
    });
  }

  if (action === "view") {
    const pet = pets.find((p) => p.id === parseInt(itemId));
    if (!pet) return;

    const embed = new EmbedBuilder()
      .setTitle(pet.name)
      .setDescription(`${pet.description}\n**Price:** $${pet.price}`)
      .setImage(pet.image);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`add-${userId}-${pet.id}`).setLabel("➕ Add to Cart").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`back-${userId}`).setLabel("⬅ Back to List").setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }

  if (action === "add") {
    const pet = pets.find((p) => p.id === parseInt(itemId));
    if (!pet) return;

    userCarts[userId] ||= [];
    userCarts[userId].push(pet);

    await interaction.reply({
      content: `✅ **${pet.name}** added to your cart!`,
      ephemeral: true,
    });
  }

  if (action === "back") {
    await interaction.update({
      embeds: [getPetsListEmbed()],
      components: [getPetsButtons(userId)],
    });
  }

  if (action === "cart") {
    const cart = userCarts[userId];
    if (!cart?.length) return interaction.reply({ content: "🛒 Your cart is empty.", ephemeral: true });

    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const desc = cart.map((p) => `• ${p.name} — $${p.price}`).join("\n");

    const embed = new EmbedBuilder().setTitle("🛒 Your Cart").setDescription(`${desc}\n\n**Total: $${total}**`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`paymethod-${userId}`).setLabel("💳 Choose Payment Method").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`back-${userId}`).setLabel("⬅ Back").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (action === "paymethod") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`crypto-${userId}`).setLabel("🪙 Pay with Crypto").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`gcash-${userId}`).setLabel("📱 Pay with GCash").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "Choose your payment method:",
      components: [row],
      ephemeral: true,
    });
  }

  if (action === "crypto") {
    const cart = userCarts[userId];
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const cryptoAmount = (total / cryptoUnitPrice).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle("💸 Crypto Payment")
      .setDescription(`Send **${cryptoAmount} USDT** to:\n\`${WALLET_ADDRESS}\`\nThen upload proof of payment.`)
      .setImage(QR_IMAGE)
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`proof-${userId}`).setLabel("📤 I Paid (Upload Proof)").setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (action === "gcash") {
    const embed = new EmbedBuilder()
      .setTitle("📱 GCash Payment")
      .setDescription(`Send payment to **09090909090** and upload proof.`)
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`proof-${userId}`).setLabel("📤 I Paid (Upload Proof)").setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (action === "proof") {
    await interaction.reply({
      content: `✅ Please upload proof of payment.
An admin will review and approve the order.`,
    });
  }

  if (action === "confirm" && interaction.member.permissions.has("Administrator")) {
    const cart = userCarts[userId] || [];
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const items = cart.map((p) => `• ${p.name} - $${p.price}`).join("\n") || "No items";

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [{ title: "✅ Order Confirmed", description: `**User:** <@${userId}>\n**Total Paid:** $${total}\n\n${items}`, color: 0x2ecc71 }] })
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`close-${userId}`).setLabel("✅ Close Ticket").setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ content: `✅ Order has been confirmed and logged.`, components: [row] });
  }

  if (action === "close") {
    if (interaction.user.id !== userId && !interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ You can't close this ticket.", ephemeral: true });
    }

    await interaction.channel.send("🛑 Closing ticket in 5 seconds...");
    setTimeout(() => interaction.channel.delete(), 5000);
  }
});

client.on("messageCreate", async (message) => {
  if (message.channel.name?.startsWith("ticket-") && message.attachments.size > 0) {
    const adminRole = message.guild.roles.cache.find((r) => r.name.toLowerCase().includes("admin"));
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm-${message.author.id}`).setLabel("✅ Confirm Order").setStyle(ButtonStyle.Success)
    );
    await message.channel.send(`📬 <@&${adminRole?.id || "admin"}> proof of payment uploaded.`, { components: [row] });
  }

  if (message.content === "!setup" && message.member.permissions.has("Administrator")) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`create_ticket`).setLabel("🎫 Open Ticket").setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({
      content: "**Welcome! Click below to open a ticket and buy pets 🐾**",
      components: [row],
    });
  }
});

function getPetsListEmbed() {
  return new EmbedBuilder().setTitle("🐾 Pet Shop").setDescription("Click a pet to view more and add to cart!");
}

function getPetsButtons(userId = "temp") {
  const row = new ActionRowBuilder();
  pets.forEach((pet) => {
    row.addComponents(
      new ButtonBuilder().setCustomId(`view-${userId}-${pet.id}`).setLabel(pet.name).setStyle(ButtonStyle.Secondary)
    );
  });
  row.addComponents(
    new ButtonBuilder().setCustomId(`cart-${userId}`).setLabel("🛒 View Cart").setStyle(ButtonStyle.Primary)
  );
  return row;
}

client.login(process.env.TOKEN);
