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
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  const [action, userId, itemId] = interaction.customId.split("-");

  if (["confirm", "reject", "close"].includes(action)) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isAdmin = member.roles.cache.some((role) => role.name.toLowerCase().includes("admin"));
    if (!isAdmin) {
      await interaction.reply({
        content: "❌ You do not have permission to perform this action.",
        ephemeral: true,
      });
      return;
    }
  }
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  const [action, userId, itemId] = interaction.customId.split("-");

  if (["confirm", "reject", "close"].includes(action)) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isAdmin = member.roles.cache.some((role) => role.name.toLowerCase().includes("admin"));
    if (!isAdmin) {
      await interaction.reply({
        content: "❌ You do not have permission to perform this action.",
        ephemeral: true,
      });
      return;
    }
  }

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  const [action, userId, itemId] = interaction.customId.split("-");

  // Admin-only check for certain actions
  if (["confirm", "reject", "close"].includes(action)) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isAdmin = member.roles.cache.some((role) => role.name.toLowerCase().includes("admin"));
    if (!isAdmin) {
      await interaction.reply({
        content: "❌ You do not have permission to perform this action.",
        ephemeral: true,
      });
      return;
    }
  }

  // Modal submission: User info form
  if (interaction.isModalSubmit() && interaction.customId.startsWith("userinfo-")) {
    const username = interaction.fields.getTextInputValue("username");
    const pslink = interaction.fields.getTextInputValue("pslink");
    userOrderDetails[userId] = { username, pslink };

    const confirmationEmbed = new EmbedBuilder()
      .setTitle("📄 Order Details Submitted")
      .setDescription(`**In-game Username:** ${username}\n**Private Server Link:** ${pslink}`)
      .setColor("Yellow");

    await interaction.channel.send({
      content: `<@${userId}> submitted their information:`,
      embeds: [confirmationEmbed],
    });

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

  // Handle other button actions
  if (action === "create_ticket") {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}-${Math.floor(Math.random() * 10000)}`,
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

    const modal = new ModalBuilder()
      .setCustomId(`userinfo-${userId}`)
      .setTitle("User Info Form");

    const usernameInput = new TextInputBuilder()
      .setCustomId("username")
      .setLabel("In-game Username")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const pslinkInput = new TextInputBuilder()
      .setCustomId("pslink")
      .setLabel("Private Server Link")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(usernameInput),
      new ActionRowBuilder().addComponents(pslinkInput)
    );

    await interaction.showModal(modal);
  }

  if (action === "paycrypto" || action === "paygcash") {
    const cart = userCarts[userId];
    if (!cart || cart.length === 0) {
      await interaction.reply({
        content: "🛒 Your cart is empty.",
        ephemeral: true,
      });
      return;
    }

    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const content =
      action === "paycrypto"
        ? {
            title: "💸 Crypto Payment Info",
            desc: `Send **${(total / cryptoUnitPrice).toFixed(2)} USDT** to:\n\`${WALLET_ADDRESS}\`\nThen upload a screenshot as proof.`,
            color: "Green",
            image: QR_IMAGE,
          }
        : {
            title: "📱 GCash Payment Info",
            desc: `Send **₱${(total * PHP_RATE).toFixed(2)} PHP** to:\n**Name:** N C\n**Number:** 09624252115\nThen upload a screenshot as proof.`,
            color: "Blue",
          };

    const embed = new EmbedBuilder()
      .setTitle(content.title)
      .setDescription(content.desc)
      .setColor(content.color);

    if (content.image) embed.setImage(content.image);

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
    const adminRole = interaction.guild.roles.cache.find((r) =>
      r.name.toLowerCase().includes("admin")
    );

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
      await require("node-fetch")(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `✅ **Transaction Confirmed**\n**Username:** ${orderDetails.username}\n**Private Server Link:** ${orderDetails.pslink}\n**Pets Ordered:** ${petsList}\n**Quantity:** ${cart.length}\n**Total Price:** $${total}`,
        }),
      });
    }

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
  
});

client.on("messageCreate", async (message) => {
  if (
    message.channel.name?.startsWith("ticket-") &&
    message.attachments.size > 0
  ) {
    const adminRole = message.guild.roles.cache.find((r) =>
      r.name.toLowerCase().includes("admin")
    );
    if (!adminRole) return;

    await message.channel.send(
      `<@&${adminRole.id}>, a proof of payment was uploaded by <@${message.author.id}>. Please confirm or reject the transaction using the buttons above.`
    );
  }
});

client.login(process.env.TOKEN);
