import { Module } from "@nestjs/common";
import { OgController } from "./og.controller";
import { ProfilesModule } from "../profiles/profiles.module";

@Module({ imports: [ProfilesModule], controllers: [OgController] })
export class OgModule {}
