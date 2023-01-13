'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('Links', {
      name: 'Links_artistId',
      using: 'BTREE',
      unique: false,
      fields: ['artistId'],
    });
    await queryInterface.addIndex('Links', {
      name: 'Links_trackId',
      using: 'BTREE',
      unique: false,
      fields: ['trackId'],
    });
    await queryInterface.addIndex('Links', {
      name: 'Links_albumId',
      using: 'BTREE',
      unique: false,
      fields: ['albumId'],
    });
    await queryInterface.addIndex('Links', {
      name: 'Links_providerUrl',
      using: 'BTREE',
      unique: false,
      fields: ['providerUrl'],
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Links', 'Links_artistId');
    await queryInterface.removeIndex('Links', 'Links_trackId');
    await queryInterface.removeIndex('Links', 'Links_albumId');
    await queryInterface.removeIndex('Links', 'Links_providerUrl');
  },
};
