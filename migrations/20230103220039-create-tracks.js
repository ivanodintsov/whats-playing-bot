'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Tracks', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      albumId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      trackNumber: {
        type: Sequelize.INTEGER,
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
      explicit: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('Tracks');
  },
};
