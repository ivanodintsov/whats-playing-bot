'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'SpotifyTokens',
        ['userId', 'provider'],
        { transaction },
      );
      await queryInterface.renameTable('SpotifyTokens', 'MusicServiceTokens', {
        transaction,
      });

      await queryInterface.addColumn(
        'MusicServiceTokens',
        'service',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
      UPDATE "MusicServiceTokens"
      SET "service" = 0
      WHERE "service" IS NULL;
    `,
        { transaction },
      );

      await queryInterface.changeColumn(
        'MusicServiceTokens',
        'service',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction },
      );

      await queryInterface.addIndex(
        'MusicServiceTokens',
        ['userId', 'provider', 'service'],
        {
          where: {
            deletedAt: null,
          },
          unique: true,
          transaction,
        },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('MusicServiceTokens', 'service', {
        transaction,
      });
      await queryInterface.removeIndex(
        'MusicServiceTokens',
        ['userId', 'provider', 'service'],
        { transaction },
      );

      await queryInterface.renameTable('MusicServiceTokens', 'SpotifyTokens', {
        transaction,
      });
      await queryInterface.addIndex('SpotifyTokens', ['userId', 'provider'], {
        unique: true,
        transaction,
      });
    });
  },
};
