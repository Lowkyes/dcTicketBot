const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
require("dotenv").config();
const fetch = require("node-fetch");

const WEBHOOK_URL = "https://discord.com/api/webhooks/1401414474757312543/cdN6rnWZVw2FUuunLRxdOLDwXSgaDV2re0s9PtCIAF2g-lLs5qMF9YCtclJDps3hN_u_";

setInterval(() => {
  fetch(
    "https://0dbe80b1-e2cc-45e8-8c26-4f0626be9e71-00-bws1c45gbkms.sisko.replit.dev/"
  );
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
    description:
      "Every ~15 minutes, the Raccoon goes to another player's plot and duplicates their Crop, then gives it to the pet owner.",
    price: 6.1,
    image: "https://growagardenpro.com/pets/raccoon.webp",
  },
  {
    id: 2,
    name: "Disco Bee",
    description:
      "Disco Disco: Every ~15 minutes, has a ~16% chance a nearby fruit becomes Disco!",
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
    description:
      "Mimicry: Every ~20m, it mimics and copies an ability from another pet (in player garden) and performs its ability! But if a Mimic Octopus copies a pet with two abilities, it will only perform the first ability. The copied pet's cooldown isn't affected.",
    price: 3.5,
    image: "https://growagardenpro.com/pets/mimicoctopus.webp",
  },
];

const QR_IMAGE =
  "https://cdn.discordapp.com/attachments/1401451024501313656/1401563828713426976/image.png";
const WALLET_ADDRESS = "LXDvc4mnnxepL3JvMin2EHhTfG4mUH5WCG";
const GCASH_DETAILS = "GCash: 0912-345-6789 - Juan Dela Cruz";
const cryptoUnitPrice = 1;
const userCarts = {};

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const [action, userId, itemId] = interaction.customId.split("-");

  if (action === "create_ticket") {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}-${Math.floor(
        Math.random() * 10000
      )}`,
      type: 0,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: ["ViewChannel"],
        },
        {
          id: interaction.user.id,
          allow: ["ViewChannel", "SendMessages"],
        },
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
      new ButtonBuilder()
        .setCustomId(`add-${userId}-${pet.id}`)
        .setLabel("➕ Add to Cart")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`back-${userId}`)
        .setLabel("⬅ Back to List")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }

  if (action === "add") {
    const pet = pets.find((p) => p.id === parseInt(itemId));
    if (!pet) return;

    if (!userCarts[userId]) userCarts[userId] = [];
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
    if (!cart || cart.length === 0) {
      await interaction.reply({ content: "🛒 Your cart is empty.", ephemeral: true });
      return;
    }

    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const desc = cart.map((p) => `• ${p.name} — $${p.price}`).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🛒 Your Cart")
      .setDescription(`${desc}\n\n**Total: $${total}**`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`selectpay-${userId}`).setLabel("💳 Checkout").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`back-${userId}`).setLabel("⬅ Back").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (action === "selectpay") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`paygcash-${userId}`).setLabel("📱 Pay with GCash").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`paycrypto-${userId}`).setLabel("💰 Pay with Crypto").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "💳 Select your payment method:",
      components: [row],
      ephemeral: true,
    });
  }

  if (action === "paygcash" || action === "paycrypto") {
    const cart = userCarts[userId];
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const cryptoAmount = (total / cryptoUnitPrice).toFixed(2);

    const method = action === "paygcash" ? "GCash" : "Crypto";
    const description =
      method === "GCash"
        ? `Send **₱${total.toFixed(2)}** to:
\`${GCASH_DETAILS}\`
Then upload proof of payment.`
        : `Send **${cryptoAmount} USDT** to:
\`${WALLET_ADDRESS}\`
Then upload a screenshot as proof.`;

    const embed = new EmbedBuilder()
      .setTitle(`💸 Payment via ${method}`)
      .setDescription(description)
      .setImage(method === "Crypto" ? QR_IMAGE : null);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`proof-${userId}`)
        .setLabel("📤 I Paid (Upload Proof)")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (action === "proof") {
    await interaction.reply({
      content:
        "✅ Please upload your **proof of payment as an image or file**.\nAn admin will be notified once received.",
    });
  }

  if (action === "confirmorder") {
    await interaction.channel.send("✅ Order confirmed! Thank you for your purchase.");
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `✅ Order from <@${userId}> has been confirmed.` }),
    });

    setTimeout(() => {
      interaction.channel.send("🛑 Ticket will be closed in 5 seconds...");
      setTimeout(() => interaction.channel.delete(), 5000);
    }, 2000);
  }
});

client.on("messageCreate", async (message) => {
  if (message.channel.name.startsWith("ticket-") && message.attachments.size > 0) {
    const adminRole = message.guild.roles.cache.find((r) =>
      r.name.toLowerCase().includes("admin")
    );
    await message.channel.send(
      `📬 <@&${adminRole?.id || "admin"}>, user has submitted proof of payment.\nPlease verify and press the button below to confirm.`
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirmorder-${message.author.id}`)
        .setLabel("✅ Confirm Order")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ components: [row] });
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
