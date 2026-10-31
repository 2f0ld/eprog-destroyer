import { test } from 'node:test'
import assert from 'node:assert/strict'
import { optimizeImports } from '../src/java/imports.ts'

test('removes unused, redundant and duplicate imports; sorts into IntelliJ groups', () => {
  const src = `package app;

import java.util.Scanner;
import java.util.List;
import static java.lang.Math.max;
import java.lang.String;
import org.example.Thing;
import java.util.Scanner;
import javax.swing.JFrame;

public class A {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Thing t = null;
        System.out.println(max(1, 2) + " " + new JFrame());
    }
}
`
  const r = optimizeImports(src)
  assert.equal(r.text.split('\n\npublic class')[0], `package app;

import org.example.Thing;

import javax.swing.JFrame;
import java.util.Scanner;

import static java.lang.Math.max;`)
  assert.equal(r.removed, 3)
})

test('wildcards expand to used classes; 5+ classes collapse to *', () => {
  const r = optimizeImports('import java.util.*;\nclass B { List<String> a; Map<String, Integer> m; }\n')
  assert.equal(r.text, 'import java.util.List;\nimport java.util.Map;\nclass B { List<String> a; Map<String, Integer> m; }\n')
  const many = 'import java.util.List;\nimport java.util.Map;\nimport java.util.Set;\nimport java.util.HashMap;\nimport java.util.ArrayList;\nclass C { List a; Map b; Set c; HashMap d; ArrayList e; }\n'
  assert.equal(optimizeImports(many).text, 'import java.util.*;\nclass C { List a; Map b; Set c; HashMap d; ArrayList e; }\n')
})

test('drops the whole block when nothing is used', () => {
  assert.equal(optimizeImports('import java.util.List;\n\npublic class D {}\n').text, 'public class D {}\n')
})
