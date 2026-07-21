'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'SystemMusicServiceTokens',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            unique: true,
          },
          service: {
            type: Sequelize.INTEGER,
            allowNull: true,
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
        },
        { transaction },
      );

      await queryInterface.addIndex('SystemMusicServiceTokens', ['service'], {
        name: 'system_music_service_token_service_idx',
        transaction,
      });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'SystemMusicServiceTokens',
        'system_music_service_token_service_idx',
        { transaction },
      );
      await queryInterface.dropTable('SystemMusicServiceTokens', {
        transaction,
      });
    });
  },
};
