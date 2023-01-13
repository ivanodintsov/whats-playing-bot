'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('SharedTracks', ['createdAt', 'id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('SharedTracks', ['createdAt', 'id']);
  },
};
