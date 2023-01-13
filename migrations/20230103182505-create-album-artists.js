'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable(
        'AlbumArtists',
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
            allowNull: false,
          },
          albumId: {
            type: Sequelize.UUID,
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

      // await queryInterface.addIndex('AlbumArtists', {
      //   name: 'AlbumArtists_artistId_albumId',
      //   using: 'BTREE',
      //   unique: true,
      //   fields: ['artistId', 'albumId'],
      //   transaction: t,
      // });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async t => {
      // await queryInterface.removeIndex(
      //   'AlbumArtists',
      //   'AlbumArtists_artistId_albumId',
      //   {
      //     transaction: t,
      //   },
      // );
      await queryInterface.dropTable('AlbumArtists', { transaction: t });
    });
  },
};
