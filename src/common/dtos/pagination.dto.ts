import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsPositive, Min } from "class-validator";

export class PaginationDto {
    
    @IsOptional()
    @IsPositive()
    //Por defecto los valores que se reciben en los DTOs son strings, por lo que es necesario convertirlos a Number
    @Type(() => Number) 
    limit?: number;

    @IsOptional()
    @Min(0)
    @Type(() => Number)
    offset?: number;
}