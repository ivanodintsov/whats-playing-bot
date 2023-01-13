'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SpotifyTokens', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      provider: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      token_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      expires_in: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expires_date: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      scope: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      deletedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('SpotifyTokens', ['userId', 'provider'], {
      unique: true,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('SpotifyTokens', ['userId', 'provider']);
    await queryInterface.dropTable('SpotifyTokens');
  },
};
