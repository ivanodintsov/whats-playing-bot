import { Test, TestingModule } from '@nestjs/testing';
import { ImportDbService } from './import-db.service';

describe('ImportDbService', () => {
  let service: ImportDbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportDbService],
    }).compile();

    service = module.get<ImportDbService>(ImportDbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
