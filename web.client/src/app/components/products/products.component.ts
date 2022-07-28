import { Component, OnInit } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { Product } from 'src/app/api/product';
import { ProductService } from 'src/app/service/productservice';

@Component({
    templateUrl: 'products.component.html',
    styleUrls: ['products.component.scss'],
})
export class ProductsComponent implements OnInit {
    products: Product[];

    sortOptions: SelectItem[];

    sortOrder: number;

    sortField: string;

    constructor(private productService: ProductService) {}

    ngOnInit(): void {
        this.productService
            .getProducts()
            .then((data) => (this.products = data));

        this.sortOptions = [
            { label: 'Sort name from A to Z', value: 'name' },
            { label: 'Sort name from Z to A', value: '!name' },
        ];
    }

    onSortChange(event) {
        const value = event.value;

        if (value.indexOf('!') === 0) {
            this.sortOrder = -1;
            this.sortField = value.substring(1, value.length);
        } else {
            this.sortOrder = 1;
            this.sortField = value;
        }
    }
}
