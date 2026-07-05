'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable('SpotifyTokens', 'MusicServiceTokens');

    await queryInterface.addColumn('MusicServiceTokens', 'service', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE "MusicServiceTokens"
      SET "service" = 0
      WHERE "service" IS NULL;
    `);

    await queryInterface.changeColumn('MusicServiceTokens', 'service', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.removeIndex('MusicServiceTokens', [
      'userId',
      'provider',
    ]);
    await queryInterface.addIndex(
      'MusicServiceTokens',
      ['userId', 'provider', 'service'],
      {
        unique: true,
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('MusicServiceTokens', 'service');

    await queryInterface.removeIndex('MusicServiceTokens', [
      'userId',
      'provider',
      'service',
    ]);
    await queryInterface.addIndex(
      'MusicServiceTokens',
      ['userId', 'provider'],
      {
        unique: true,
      },
    );

    await queryInterface.renameTable('MusicServiceTokens', 'SpotifyTokens');
  },
};
