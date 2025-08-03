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
const cryptoUnitPrice = 1;
const WEBHOOK_URL = "https://discord.com/api/webhooks/1401414474757312543/cdN6rnWZVw2FUuunLRxdOLDwXSgaDV2re0s9PtCIAF2g-lLs5qMF9YCtclJDps3hN_u_";

const userCarts = {}; // temporary cart storage

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
      components: [getPetsButtons(userId)],
    });

    await interaction.reply({
      content: `✅ Ticket created: ${ticketChannel}`,
      ephemeral: true,
    });
  }

  if (action === "pay") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`crypto-${userId}`)
        .setLabel("Pay with Crypto")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`gcash-${userId}`)
        .setLabel("Pay with GCash")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "Choose your payment method:",
      components: [row],
      ephemeral: true,
    });
  }

  if (action === "crypto" || action === "gcash") {
    const cart = userCarts[userId];
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const cryptoAmount = (total / cryptoUnitPrice).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle("💸 Payment Info")
      .setDescription(
        action === "crypto"
          ? `Send **${cryptoAmount} USDT** to:
\`${WALLET_ADDRESS}\`
Then upload a screenshot as proof.`
          : "Send the correct amount to GCash number: `09XXXXXXXXX`\nThen upload a screenshot as proof."
      )
      .setImage(QR_IMAGE)
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`proof-${userId}`)
        .setLabel("Upload Proof")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (action === "proof") {
    await interaction.reply({
      content:
        "✅ Please upload your **proof of payment as an image or file**. An admin will be notified.",
    });
  }

  if (action === "close") {
    await interaction.channel.send("🛑 Ticket will close in 5 seconds...");
    setTimeout(() => {
      interaction.channel.delete();
    }, 5000);
  }
});

client.on("messageCreate", async (message) => {
  if (
    message.channel.name.startsWith("ticket-") &&
    message.attachments.size > 0
  ) {
    const adminRole = message.guild.roles.cache.find((r) =>
      r.name.toLowerCase().includes("admin")
    );

    const cart = userCarts[message.author.id] || [];
    const orderSummary = cart.map((p) => `• ${p.name} — $${p.price}`).join("\n");
    const total = cart.reduce((sum, p) => sum + p.price, 0);

    const webhookData = {
      content: `New order from <@${message.author.id}>`,
      embeds: [
        {
          title: "Order Summary",
          description: `${orderSummary}\n\n**Total: $${total}**`,
          color: 0x00ff00,
        },
      ],
    };

    require("node-fetch")(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookData),
    });

    await message.channel.send(
      `📨 <@&${adminRole?.id || "admin"}>, user has submitted proof of payment.`
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close-ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({
      content: "Admin, confirm order and close ticket:",
      components: [row],
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
