const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
require("dotenv").config();

setInterval(() => {
  require("node-fetch")(
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
      "Mimicry: Every ~20m, it mimics and copies an ability from another pet (in player garden) and performs its ability!",
    price: 3.5,
    image: "https://growagardenpro.com/pets/mimicoctopus.webp",
  },
];

const QR_IMAGE =
  "https://cdn.discordapp.com/attachments/1401451024501313656/1401563828713426976/image.png";
const WALLET_ADDRESS = "LXDvc4mnnxepL3JvMin2EHhTfG4mUH5WCG";
const cryptoUnitPrice = 1;
const PHP_RATE = 58;

const WEBHOOK_URL =
  "https://discord.com/api/webhooks/1401588463387672668/RVJjz9Livx5x3VvteDtP2mtJRx4XExeSGfK2o4JiG4MP1-YbWy1hrAaQFcqVKUUZsvZF";

const userCarts = {};
const userOrderDetails = {}; // Store username & private server link per user

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  // Modal submit for user info form
  if (interaction.isModalSubmit() && interaction.customId.startsWith("userinfo-")) {
    const userId = interaction.customId.split("-")[1];
    const username = interaction.fields.getTextInputValue("username");
    const pslink = interaction.fields.getTextInputValue("pslink");
    userOrderDetails[userId] = { username, pslink };

    const confirmationEmbed = new EmbedBuilder()
      .setTitle("📄 Order Details Submitted")
      .setDescription(
        `**In-game Username:** ${username}\n**Private Server Link:** ${pslink}`
      )
      .setColor("Yellow");

    await interaction.channel.send({
      content: `<@${userId}> submitted their information:`,
      embeds: [confirmationEmbed],
    });

    // Prompt for payment method after user info submission
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`paycrypto-${userId}`)
        .setLabel("🪙 Pay with Crypto")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`paygcash-${userId}`)
        .setLabel("📱 Pay with GCash")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "✅ Information submitted. Please choose your payment method:",
      components: [row],
      ephemeral: true,
    });
    return;
  }

  if (!interaction.isButton()) return;

  const [action, userId, itemId] = interaction.customId.split("-");

  // Helper to get admin role
  const getAdminRole = (guild) =>
    guild.roles.cache.find((r) => r.name.toLowerCase().includes("admin"));

  // Restrict admin-only buttons: close, confirm, reject
  if (["close", "confirm", "reject"].includes(action)) {
    const adminRole = getAdminRole(interaction.guild);
    if (!adminRole) {
      return interaction.reply({
        content: "❌ Admin role not found in this server.",
        ephemeral: true,
      });
    }
    if (!interaction.member.roles.cache.has(adminRole.id)) {
      return interaction.reply({
        content: "❌ You need the admin role to perform this action.",
        ephemeral: true,
      });
    }
  }

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
    userOrderDetails[interaction.user.id] = null;

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
      await interaction.reply({
        content: "🛒 Your cart is empty.",
        ephemeral: true,
      });
      return;
    }

    // Show modal form to fill username and private server link before payment
    const modal = new ModalBuilder()
      .setCustomId(`userinfo-${userId}`)
      .setTitle("User Info Form");

    const usernameInput = new TextInputBuilder()
      .setCustomId("username")
      .setLabel("In-game Username")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Enter your in-game username")
      .setRequired(true);

    const pslinkInput = new TextInputBuilder()
      .setCustomId("pslink")
      .setLabel("Private Server Link")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Enter your private server link")
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(usernameInput);
    const secondRow = new ActionRowBuilder().addComponents(pslinkInput);

    modal.addComponents(firstRow, secondRow);

    await interaction.showModal(modal);
  }

  if (action === "paymethod") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`paycrypto-${userId}`)
        .setLabel("🪙 Pay with Crypto")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`paygcash-${userId}`)
        .setLabel("📱 Pay with GCash")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "Please choose your payment method:",
      components: [row],
      ephemeral: true,
    });
  }

  if (action === "paycrypto") {
    const cart = userCarts[userId];
    if (!cart || cart.length === 0) {
      await interaction.reply({
        content: "🛒 Your cart is empty.",
        ephemeral: true,
      });
      return;
    }

    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const cryptoAmount = (total / cryptoUnitPrice).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle("💸 Crypto Payment Info")
      .setDescription(
        `Send **${cryptoAmount} USDT** to:\n\`${WALLET_ADDRESS}\`\n\nThen upload a screenshot as proof.`
      )
      .setImage(QR_IMAGE)
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`proof-${userId}`)
        .setLabel("📤 I Paid (Upload Proof)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`close-${userId}`)
        .setLabel("❌ Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (action === "paygcash") {
    const cart = userCarts[userId];
    if (!cart || cart.length === 0) {
      await interaction.reply({
        content: "🛒 Your cart is empty.",
        ephemeral: true,
      });
      return;
    }

    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const phpTotal = (total * PHP_RATE).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle("📱 GCash Payment Info")
      .setDescription(
        `Send **₱${phpTotal} PHP** to:\n\n**Name:** N C\n**Number:** 09624252115\n\nThen upload a screenshot as proof.`
      )
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`proof-${userId}`)
        .setLabel("📤 I Paid (Upload Proof)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`close-${userId}`)
        .setLabel("❌ Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (action === "proof") {
    const adminRole = getAdminRole(interaction.guild);

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-${userId}`)
        .setLabel("✅ Confirm Transaction")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject-${userId}`)
        .setLabel("❌ Reject Transaction")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: `✅ Please upload your **proof of payment**.\n<@&${adminRole?.id || "admin"}>, please confirm once verified below.`,
      components: [confirmRow],
    });
  }

  if (action === "confirm" || action === "reject") {
    const orderDetails = userOrderDetails[userId];
    const cart = userCarts[userId];
    if (!orderDetails || !cart) {
      await interaction.reply({
        content: "⚠ Order details or cart not found.",
        ephemeral: true,
      });
      return;
    }

    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const petsList = cart.map((p) => p.name).join(", ");

    const status = action === "confirm" ? "✅ Transaction Confirmed" : "❌ Transaction Rejected";
    const color = action === "confirm" ? "Green" : "Red";

    const statusEmbed = new EmbedBuilder()
      .setTitle(status)
      .addFields(
        { name: "Username", value: orderDetails.username },
        { name: "Private Server", value: orderDetails.pslink },
        { name: "Pets", value: petsList },
        { name: "Quantity", value: `${cart.length}` },
        { name: "Total Price", value: `$${total}` }
      )
      .setColor(color);

    await interaction.channel.send({ embeds: [statusEmbed] });

    if (action === "confirm") {
      // Send order info to webhook
      await require("node-fetch")(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `✅ **Transaction Confirmed**\n**Username:** ${orderDetails.username}\n**Private Server Link:** ${orderDetails.pslink}\n**Pets Ordered:** ${petsList}\n**Quantity:** ${cart.length}\n**Total Price:** $${total}`,
        }),
      });
    }

    // Clear user's cart and order details
    userCarts[userId] = [];
    userOrderDetails[userId] = null;

    await interaction.channel.send("🛑 Ticket will close in 5 seconds...");
    setTimeout(() => {
      interaction.channel.delete();
    }, 5000);
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
    message.channel.name?.startsWith("ticket-") &&
    message.attachments.size > 0
  ) {
    // Auto-forward proof of payment attachment to admin for verification
    const adminRole = message.guild.roles.cache.find((r) =>
      r.name.toLowerCase().includes("admin")
    );
    if (!adminRole) return;

    await message.channel.send(
      `<@&${adminRole.id}>, a proof of payment was uploaded by <@${message.author.id}>. Please confirm or reject the transaction using the buttons above.`
    );
  }
});

function getPetsListEmbed() {
  const embed = new EmbedBuilder()
    .setTitle("🐾 Available Pets")
    .setDescription(
      "Click the buttons below to view details and add pets to your cart."
    )
    .setColor("Aqua");

  pets.forEach((pet) => {
    embed.addFields({
      name: pet.name,
      value: `$${pet.price.toFixed(2)}`,
      inline: true,
    });
  });

  return embed;
}

function getPetsButtons(userId) {
  const row = new ActionRowBuilder();

  pets.forEach((pet) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`view-${userId}-${pet.id}`)
        .setLabel(pet.name)
        .setStyle(ButtonStyle.Primary)
    );
  });

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`cart-${userId}`)
      .setLabel("🛒 View Cart")
      .setStyle(ButtonStyle.Secondary)
  );

  return row;
}

client.login(process.env.TOKEN);
