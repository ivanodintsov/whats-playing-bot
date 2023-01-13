'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Albums', 'name', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.changeColumn('Artists', 'name', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.changeColumn('Tracks', 'name', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.changeColumn('Links', 'providerUrl', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.changeColumn('Links', 'providerId', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Albums', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('Artists', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('Tracks', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('Links', 'providerUrl', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('Links', 'providerId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
