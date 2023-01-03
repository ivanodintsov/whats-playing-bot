'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable(
        'Links',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            unique: true,
          },
          artistId: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          songId: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          albumId: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          type: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          provider: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          providerId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          providerUrl: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
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
        { transaction: t },
      );
      await queryInterface.addIndex('Links', {
        name: 'Links_artistId_providerUrl',
        using: 'BTREE',
        unique: true,
        fields: ['type', 'artistId', 'providerUrl'],
        transaction: t,
      });
      await queryInterface.addIndex('Links', {
        name: 'Links_songId_providerUrl',
        using: 'BTREE',
        unique: true,
        fields: ['type', 'songId', 'providerUrl'],
        transaction: t,
      });
      await queryInterface.addIndex('Links', {
        name: 'Links_albumId_providerUrl',
        using: 'BTREE',
        unique: true,
        fields: ['type', 'albumId', 'providerUrl'],
        transaction: t,
      });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeIndex('Links', 'Links_artistId_providerUrl', {
        transaction: t,
      });
      await queryInterface.removeIndex('Links', 'Links_songId_providerUrl', {
        transaction: t,
      });
      await queryInterface.removeIndex('Links', 'Links_albumId_providerUrl', {
        transaction: t,
      });
      await queryInterface.dropTable('Links', { transaction: t });
    });
  },
};
