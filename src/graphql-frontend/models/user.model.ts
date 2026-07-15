import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserEntity {
  @Field()
  id: string;
}

@ObjectType()
export class UserEntityResponse {
  @Field((type) => UserEntity, { nullable: false })
  user: UserEntity;
}
