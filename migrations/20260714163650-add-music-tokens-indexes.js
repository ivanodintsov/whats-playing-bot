'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex(
      'MusicServiceTokens',
      [
        'service',
        {
          name: 'updatedAt',
          order: 'DESC',
        },
      ],
      {
        unique: false,
        name: 'music_service_tokens_service_updated_at_desc_idx',
      },
    );
    await queryInterface.addIndex(
      'MusicServiceTokens',
      ['userId', 'provider'],
      {
        unique: false,
        name: 'music_service_tokens_user_id_provider_idx',
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'MusicServiceTokens',
      'music_service_tokens_service_updated_at_desc_idx',
    );
    await queryInterface.removeIndex(
      'MusicServiceTokens',
      'music_service_tokens_user_id_provider_idx',
    );
  },
};
