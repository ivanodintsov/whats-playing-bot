'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable(
        'ArtistGenres',
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
          genreId: {
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

      // await queryInterface.addIndex('ArtistGenres', {
      //   name: 'ArtistGenres_artistId_genreId_unique',
      //   using: 'BTREE',
      //   unique: true,
      //   fields: ['artistId', 'genreId'],
      //   transaction: t,
      // });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async t => {
      // await queryInterface.removeIndex(
      //   'ArtistGenres',
      //   'ArtistGenres_artistId_genreId_unique',
      //   { transaction: t },
      // );
      await queryInterface.dropTable('ArtistGenres', { transaction: t });
    });
  },
};
