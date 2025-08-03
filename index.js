const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  Events,
  InteractionType,
} = require("discord.js");
require("dotenv").config();
const fetch = require("node-fetch");

setInterval(() => {
  fetch("https://0dbe80b1-e2cc-45e8-8c26-4f0626be9e71-00-bws1c45gbkms.sisko.replit.dev/");
}, 4 * 60 * 1000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const pets = [
  {
    id: 1,
    name: "Raccoon",
    description: "Every ~15 minutes, the Raccoon goes to another player's plot and duplicates their Crop, then gives it to the pet owner.",
    price: 6.1,
    image: "https://growagardenpro.com/pets/raccoon.webp",
  },
  {
    id: 2,
    name: "Disco Bee",
    description: "Disco Disco: Every ~15 minutes, has a ~16% chance a nearby fruit becomes Disco!",
    price: 6.1,
    image: "https://growagardenpro.com/pets/discobee.webp",
  },
  {
    id: 3,
    name: "Dragon Fly",
    description: "Every ~5 minutes, turns one random fruit Gold.",
    price: 4.5,
    image: "https://growagardenpro.com/pets/dragonfly.webp",
  },
  {
    id: 4,
    name: "Mimic",
    description: "Mimicry: Every ~20m, it mimics and copies an ability from another pet (in player garden) and performs its ability!",
    price: 3.5,
    image: "https://growagardenpro.com/pets/mimicoctopus.webp",
  },
];

const QR_IMAGE = "https://cdn.discordapp.com/attachments/1401451024501313656/1401563828713426976/image.png";
const WALLET_ADDRESS = "LXDvc4mnnxepL3JvMin2EHhTfG4mUH5WCG";
const WEBHOOK_URL = "https://discord.com/api/webhooks/1401588463387672668/RVJjz9Livx5x3VvteDtP2mtJRx4XExeSGfK2o4JiG4MP1-YbWy1hrAaQFcqVKUUZsvZF";
const cryptoUnitPrice = 1;
const PHP_RATE = 58;
const userCarts = {};
const orderDetails = {};

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isModalSubmit()) {
    const userId = interaction.user.id;
    const username = interaction.fields.getTextInputValue("username_input");
    const link = interaction.fields.getTextInputValue("link_input");
    orderDetails[userId] = { username, link };

    const cart = userCarts[userId];
    const total = cart.reduce((sum, p) => sum + p.price, 0);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`paymethod-${userId}`)
        .setLabel("💳 Choose Payment Method")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: `✅ Thank you! Please proceed to payment.`,
      components: [row],
    });
  }

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

  if (action === "cart") {
    const modal = new ModalBuilder()
      .setCustomId(`checkoutmodal-${userId}`)
      .setTitle("Before Checkout")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("username_input")
            .setLabel("Enter Your Roblox Username")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("link_input")
            .setLabel("Private Server Link")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    return await interaction.showModal(modal);
  }

  if (action === "paymethod") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`pay-crypto-${userId}`)
        .setLabel("🪙 Pay with Crypto")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`pay-gcash-${userId}`)
        .setLabel("📱 Pay with GCash")
        .setStyle(ButtonStyle.Secondary)
    );
    return await interaction.reply({
      content: "Please choose your payment method:",
      components: [row],
      ephemeral: true,
    });
  }

  if (action === "pay" && itemId === "crypto") {
    const cart = userCarts[userId];
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const cryptoAmount = (total / cryptoUnitPrice).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle("💸 Payment Info")
      .setDescription(`Send **${cryptoAmount} USDT** to:
\`${WALLET_ADDRESS}\`

Then upload a screenshot as proof.`)
      .setImage(QR_IMAGE)
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`proof-${userId}`)
        .setLabel("📤 I Paid (Upload Proof)")
        .setStyle(ButtonStyle.Success)
    );

    return await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (action === "pay" && itemId === "gcash") {
    const cart = userCarts[userId];
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const phpTotal = (total * PHP_RATE).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle("📱 GCash Payment Info")
      .setDescription(`Send **₱${phpTotal} PHP** to:
**Name:** N C
**Number:** 09624252115

Then upload a screenshot as proof.`)
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`proof-${userId}`)
        .setLabel("📤 I Paid (Upload Proof)")
        .setStyle(ButtonStyle.Success)
    );

    return await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (action === "proof") {
    await interaction.reply({
      content: "✅ Please upload your **proof of payment as an image or file**.\nAn admin will be notified once received.",
    });
  }

  if (action === "confirm") {
    const cart = userCarts[userId] || [];
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const proofMsg = interaction.message.attachments.first()?.url || "[No image]";
    const order = orderDetails[userId] || {};

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `✅ **New Confirmed Order**
**User ID:** ${userId}
**Username:** ${order.username || "N/A"}
**Private Server:** ${order.link || "N/A"}
**Pets:** ${cart.map((p) => p.name).join(", ")}
**Quantity:** ${cart.length}
**Total Price:** $${total}
**Proof:** ${proofMsg}`,
      }),
    });

    await interaction.channel.send("✅ Order confirmed and sent to admin log.");
    await interaction.channel.send("🛑 Ticket will close in 5 seconds...");
    setTimeout(() => {
      interaction.channel.delete();
    }, 5000);
  }
});

client.on("messageCreate", async (message) => {
  if (
    message.channel.name?.startsWith("ticket-") &&
    message.attachments.size > 0
  ) {
    const adminRole = message.guild.roles.cache.find((r) =>
      r.name.toLowerCase().includes("admin")
    );
    await message.channel.send({
      content: `📬 <@&${adminRole?.id || "admin"}>, user has submitted proof of payment. Please verify.`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm-${message.author.id}`)
            .setLabel("✅ Confirm Order")
            .setStyle(ButtonStyle.Success)
        ),
      ],
    });
  }

  if (
    message.content === "!setup" &&
    message.member.permissions.has("Administrator")
  ) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`create_ticket`)
        .setLabel("🎫 Open Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({
      content: "**Welcome! Click below to open a ticket and buy pets 🐾**",
      components: [row],
    });
  }
});

function getPetsListEmbed() {
  return new EmbedBuilder()
    .setTitle("🐾 Pet Shop")
    .setDescription("Click any button below to view more about the pet!");
}

function getPetsButtons(userId = "temp") {
  const row = new ActionRowBuilder();
  pets.forEach((pet) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`view-${userId}-${pet.id}`)
        .setLabel(pet.name)
        .setStyle(ButtonStyle.Secondary)
    );
  });
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`cart-${userId}`)
      .setLabel("🛒 View Cart")
      .setStyle(ButtonStyle.Primary)
  );
  return row;
}

client.login(process.env.TOKEN);
