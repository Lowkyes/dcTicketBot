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

const FORM_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1401414474757312543/cdN6rnWZVw2FUuunLRxdOLDwXSgaDV2re0s9PtCIAF2g-lLs5qMF9YCtclJDps3hN_u_";

const userCarts = {};
const userOrderDetails = {};

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isModalSubmit() && interaction.customId.startsWith("userinfo-")) {
    const userId = interaction.customId.split("-")[1];
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

  if (!interaction.isButton()) return;

  const [action, userId, itemId] = interaction.customId.split("-");

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

    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const desc = cart.map((p) => `• ${p.name} — $${p.price}`).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🛒 Your Cart")
      .setDescription(`${desc}\n\n**Total: $${total}**`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`userinfoform-${userId}`)
        .setLabel("✍️ Fill Order Details")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`back-${userId}`)
        .setLabel("⬅ Back")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }

  if (action === "userinfoform") {
    // Show modal to user to fill username and private server link
    const modal = new ModalBuilder()
      .setCustomId(`userinfo-${userId}`)
      .setTitle("Order Details");

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

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
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
    const phpAmount = (total * PHP_RATE).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle("💸 GCash Payment Info")
      .setDescription(
        `Send **₱${phpAmount}** to the GCash number provided.\n\nThen upload a screenshot as proof.`
      )
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

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
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
      ephemeral: true,
    });
  }

  if (action === "confirm" || action === "reject") {
    // Only admins can confirm/reject
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const adminRole = interaction.guild.roles.cache.find((r) =>
      r.name.toLowerCase().includes("admin")
    );
    if (!adminRole || !member.roles.cache.has(adminRole.id)) {
      await interaction.reply({
        content: "❌ You do not have permission to perform this action.",
        ephemeral: true,
      });
      return;
    }

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
      // Send order info to original webhook
      await require("node-fetch")(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `✅ **Transaction Confirmed**\n**Username:** ${orderDetails.username}\n**Private Server Link:** ${orderDetails.pslink}\n**Pets Ordered:** ${petsList}\n**Quantity:** ${cart.length}\n**Total Price:** $${total}`,
        }),
      });

      // Send form info to new webhook
      await require("node-fetch")(FORM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `📋 **User Info Form Submission**\n**Username:** ${orderDetails.username}\n**Private Server Link:** ${orderDetails.pslink}`,
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
    await interaction.channel.delete();
  }
});

function getPetsListEmbed() {
  const embed = new EmbedBuilder()
    .setTitle("🐾 Pets Shop")
    .setDescription("Select a pet to view details or add to your cart.")
    .setColor("Blue");

  pets.forEach((pet) => {
    embed.addFields({ name: pet.name, value: `$${pet.price}`, inline: true });
  });

  return embed;
}

function getPetsButtons(userId) {
  const buttons = pets.map((pet) =>
    new ButtonBuilder()
      .setCustomId(`view-${userId}-${pet.id}`)
      .setLabel(pet.name)
      .setStyle(ButtonStyle.Primary)
  );

  buttons.push(
    new ButtonBuilder().setCustomId(`cart-${userId}`).setLabel("🛒 View Cart").setStyle(ButtonStyle.Secondary)
  );

  return [new ActionRowBuilder().addComponents(buttons)];
}

client.login(process.env.DISCORD_TOKEN);
