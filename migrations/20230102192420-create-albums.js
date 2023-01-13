'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Albums', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      albumType: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      availableMarkets: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
      },
      isrc: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
      },
      upc: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
      },
      ean: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
      },
      totalTracks: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      links: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      image: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      releaseDate: {
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
      deletedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Albums');
  },
};
