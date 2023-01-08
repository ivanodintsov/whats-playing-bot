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
      oldId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
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
      tg_id: {
        type: Sequelize.STRING,
        allowNull: true,
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SpotifyTokens');
  },
};
