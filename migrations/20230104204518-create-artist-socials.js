'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable(
        'ArtistSocials',
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
            references: {
              model: {
                tableName: 'Artists',
              },
              key: 'id',
            },
          },
          social: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          url: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          status: {
            type: Sequelize.INTEGER,
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
        { transaction: t },
      );

      await queryInterface.addIndex('ArtistSocials', {
        name: 'ArtistSocials_artistId_social_url',
        using: 'BTREE',
        unique: true,
        fields: ['artistId', 'social', 'url'],
        transaction: t,
      });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeIndex(
        'ArtistSocials',
        'ArtistSocials_artistId_social_url',
        {
          transaction: t,
        },
      );
      await queryInterface.dropTable('ArtistSocials', { transaction: t });
    });
  },
};
